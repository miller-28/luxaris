const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { UserStatus, AuthMethod } = require('../../domain/models/user');
const RoleRepository = require('../../infrastructure/persistence/role_repository');
const AclRepository = require('../../infrastructure/persistence/acl_repository');
const OAuthProviderRepository = require('../../infrastructure/repositories/oauth-provider-repository');
const OAuthAccountRepository = require('../../infrastructure/repositories/oauth-account-repository');

class AuthService {
    constructor(user_repository, config, system_logger, event_registry) {
        this.user_repository = user_repository;
        this.config = config;
        this.system_logger = system_logger;
        this.event_registry = event_registry;
        this.role_repository = new RoleRepository();
        this.acl_repository = new AclRepository();
        this.oauth_provider_repository = new OAuthProviderRepository();
        this.oauth_account_repository = new OAuthAccountRepository();
    }

    async hash_password(password) {
        return await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536, // 64 MB
            timeCost: 3,
            parallelism: 4
        });
    }

    async verify_password(hash, password) {
        try {
            return await argon2.verify(hash, password);
        } catch (error) {
            this.system_logger.error(
                'AuthService',
                'Password verification failed',
                error,
                {}
            );
            return false;
        }
    }

    generate_jwt(user, roles = []) {
        const payload = {
            sub: user.id,
            typ: 'user',
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            is_root: user.is_root,
            roles: roles,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this._parse_expiration(this.config.jwt_expiration)
        };

        return jwt.sign(payload, this.config.jwt_secret);
    }

    generate_refresh_token(user) {
        const payload = {
            sub: user.id,
            typ: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this._parse_expiration(this.config.jwt_refresh_expiration)
        };

        return jwt.sign(payload, this.config.jwt_secret);
    }

    verify_token(token) {
        try {
            return jwt.verify(token, this.config.jwt_secret);
        } catch (error) {
            this.system_logger.warning(
                'AuthService',
                'Token verification failed',
                { error: error.message }
            );
            throw new Error('Invalid or expired token');
        }
    }

    async register_user(registration_data) {
        // Check if email already exists
        const email_exists = await this.user_repository.email_exists(registration_data.email);
        if (email_exists) {
            throw new Error('Email already registered');
        }

        // Check if this is the first user
        const is_first = await this.user_repository.is_first_user();

        // Hash password if provided
        let password_hash = null;
        if (registration_data.password) {
            password_hash = await this.hash_password(registration_data.password);
        }

        // Create user
        const user_data = {
            email: registration_data.email.toLowerCase(),
            password_hash,
            name: registration_data.name,
            timezone: registration_data.timezone || 'UTC',
            locale: registration_data.locale || 'en',
            auth_method: 'password',
            status: is_first ? UserStatus.ACTIVE : UserStatus.PENDING_APPROVAL,
            is_root: is_first
        };

        const user = await this.user_repository.create(user_data);

        // Auto-assign admin role if this is a root user
        if (user.is_root) {
            const admin_role = await this.role_repository.find_by_slug('admin');
            if (admin_role) {
                await this.acl_repository.assign_role(user.id, 'user', admin_role.id);
                await this.system_logger.info(
                    'AuthService',
                    'Admin role assigned to root user',
                    { user_id: user.id, role_id: admin_role.id }
                );
            }
        }

        // Log registration
        await this.system_logger.info(
            'AuthService',
            'User registered successfully',
            { user_id: user.id, email: user.email, is_root: user.is_root }
        );

        // Record event
        await this.event_registry.record('auth', 'USER_REGISTERED', {
            principal_id: user.id,
            principal_type: 'user',
            resource_type: 'user',
            resource_id: user.id,
            metadata: { auth_method: 'password', is_root: user.is_root }
        });

        return user;
    }

    async login_user(email, password) {
        // Find user by email
        const user = await this.user_repository.find_by_email(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user can login
        if (!user.can_login()) {
            if (user.is_disabled()) {
                throw new Error('Account is disabled');
            }
            if (user.needs_approval()) {
                throw new Error('Account pending approval');
            }
            throw new Error('Account not active');
        }

        // Verify password
        if (!user.has_password_auth()) {
            throw new Error('Password authentication not enabled for this account');
        }

        const is_valid = await this.verify_password(user.password_hash, password);
        if (!is_valid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await this.user_repository.update(user.id, {
            last_login_at: new Date()
        });

        // Log login
        await this.system_logger.info(
            'AuthService',
            'User logged in successfully',
            { user_id: user.id, email: user.email }
        );

        // Record event
        await this.event_registry.record('auth', 'USER_LOGIN', {
            principal_id: user.id,
            principal_type: 'user',
            resource_type: 'user',
            resource_id: user.id,
            metadata: { auth_method: 'password' }
        });

        return user;
    }

    async refresh_access_token(refresh_token) {
        const payload = this.verify_token(refresh_token);

        if (payload.typ !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const user = await this.user_repository.find_by_id(payload.sub);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.can_login()) {
            throw new Error('User cannot login');
        }

        return this.generate_jwt(user);
    }

    /**
     * Register user via OAuth (Google, etc.)
     * @param {object} oauth_data - OAuth provider data and user info
     * @returns {object} { user, tokens, needs_approval }
     */
    async register_oauth_user(oauth_data) {
        const { provider_key, provider_user_id, email, name, avatar_url, token_data } = oauth_data;

        // Get OAuth provider
        const provider = await this.oauth_provider_repository.find_by_key(provider_key);
        if (!provider) {
            throw new Error(`OAuth provider '${provider_key}' not found`);
        }

        if (provider.status !== 'active') {
            throw new Error(`OAuth provider '${provider_key}' is not active`);
        }

        // Check if OAuth account already exists
        const existing_oauth_account = await this.oauth_account_repository.find_by_provider_user(
            provider.id,
            provider_user_id
        );

        if (existing_oauth_account) {
            // User already registered with this OAuth account
            const user = await this.user_repository.find_by_id(existing_oauth_account.user_id);
            
            if (!user) {
                throw new Error('User not found');
            }

            // Update last login
            await this.user_repository.update(user.id, {
                last_login_at: new Date()
            });

            // Update OAuth tokens
            const token_expires_at = token_data.expires_in 
                ? new Date(Date.now() + token_data.expires_in * 1000)
                : null;

            await this.oauth_account_repository.update(existing_oauth_account.id, {
                access_token: token_data.access_token,
                refresh_token: token_data.refresh_token || existing_oauth_account.refresh_token,
                token_expires_at: token_expires_at,
                provider_name: name,
                provider_avatar_url: avatar_url
            });

            // Check if user can login
            const needs_approval = !user.can_login();

            // Log login
            await this.system_logger.info(
                'AuthService',
                'OAuth user logged in',
                { user_id: user.id, email: user.email, provider: provider_key, needs_approval }
            );

            // Record event
            await this.event_registry.record('auth', 'USER_LOGIN', {
                principal_id: user.id,
                principal_type: 'user',
                resource_type: 'user',
                resource_id: user.id,
                metadata: { auth_method: 'oauth', provider: provider_key }
            });

            // Get user roles
            const role_assignments = await this.acl_repository.get_principal_roles(user.id, 'user');
            const roles = role_assignments.map(ra => ra.role);

            return {
                user,
                tokens: needs_approval ? null : {
                    access_token: this.generate_jwt(user, roles),
                    refresh_token: this.generate_refresh_token(user)
                },
                needs_approval
            };
        }

        // Check if email already exists (account linking case)
        const existing_user = await this.user_repository.find_by_email(email);
        
        if (existing_user) {
            // Link OAuth account to existing user
            const token_expires_at = token_data.expires_in 
                ? new Date(Date.now() + token_data.expires_in * 1000)
                : null;

            await this.oauth_account_repository.create({
                user_id: existing_user.id,
                provider_id: provider.id,
                provider_user_id: provider_user_id,
                provider_email: email,
                provider_name: name,
                provider_avatar_url: avatar_url,
                access_token: token_data.access_token,
                refresh_token: token_data.refresh_token,
                token_expires_at: token_expires_at
            });

            // Update user avatar if not set
            if (!existing_user.avatar_url && avatar_url) {
                await this.user_repository.update(existing_user.id, {
                    avatar_url: avatar_url
                });
                existing_user.avatar_url = avatar_url;
            }

            // Update last login
            await this.user_repository.update(existing_user.id, {
                last_login_at: new Date()
            });

            await this.system_logger.info(
                'AuthService',
                'OAuth account linked to existing user',
                { user_id: existing_user.id, email: email, provider: provider_key }
            );

            // Record event
            await this.event_registry.record('auth', 'OAUTH_ACCOUNT_LINKED', {
                principal_id: existing_user.id,
                principal_type: 'user',
                resource_type: 'user',
                resource_id: existing_user.id,
                metadata: { provider: provider_key }
            });

            // Check if user can login
            const needs_approval = !existing_user.can_login();

            // Get user roles
            const role_assignments = await this.acl_repository.get_principal_roles(existing_user.id, 'user');
            const roles = role_assignments.map(ra => ra.role);

            return {
                user: existing_user,
                tokens: needs_approval ? null : {
                    access_token: this.generate_jwt(existing_user, roles),
                    refresh_token: this.generate_refresh_token(existing_user)
                },
                needs_approval
            };
        }

        // New user registration
        const is_first = await this.user_repository.is_first_user();

        // Create user
        const user_data = {
            email: email.toLowerCase(),
            password_hash: null, // No password for OAuth users
            name: name,
            avatar_url: avatar_url,
            timezone: 'UTC',
            locale: 'en',
            auth_method: AuthMethod.OAUTH,
            status: is_first ? UserStatus.ACTIVE : UserStatus.PENDING_APPROVAL,
            is_root: is_first
        };

        const user = await this.user_repository.create(user_data);

        // Create OAuth account link
        const token_expires_at = token_data.expires_in 
            ? new Date(Date.now() + token_data.expires_in * 1000)
            : null;

        await this.oauth_account_repository.create({
            user_id: user.id,
            provider_id: provider.id,
            provider_user_id: provider_user_id,
            provider_email: email,
            provider_name: name,
            provider_avatar_url: avatar_url,
            access_token: token_data.access_token,
            refresh_token: token_data.refresh_token,
            token_expires_at: token_expires_at
        });

        // Auto-assign admin role if this is a root user
        if (user.is_root) {
            const admin_role = await this.role_repository.find_by_slug('admin');
            if (admin_role) {
                await this.acl_repository.assign_role(user.id, 'user', admin_role.id);
                await this.system_logger.info(
                    'AuthService',
                    'Admin role assigned to root user',
                    { user_id: user.id, role_id: admin_role.id }
                );
            }
        }

        // Log registration
        await this.system_logger.info(
            'AuthService',
            'OAuth user registered successfully',
            { user_id: user.id, email: user.email, is_root: user.is_root, provider: provider_key }
        );

        // Record event
        await this.event_registry.record('auth', 'USER_REGISTERED', {
            principal_id: user.id,
            principal_type: 'user',
            resource_type: 'user',
            resource_id: user.id,
            metadata: { auth_method: 'oauth', provider: provider_key, is_root: user.is_root }
        });

        const needs_approval = !user.can_login();

        // Get user roles
        const role_assignments = await this.acl_repository.get_principal_roles(user.id, 'user');
        const roles = role_assignments.map(ra => ra.role);

        return {
            user,
            tokens: needs_approval ? null : {
                access_token: this.generate_jwt(user, roles),
                refresh_token: this.generate_refresh_token(user)
            },
            needs_approval
        };
    }

    _parse_expiration(exp_string) {
        // Parse expiration strings like "24h", "7d", etc.
        const unit = exp_string.slice(-1);
        const value = parseInt(exp_string.slice(0, -1));

        switch (unit) {
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            case 'm':
                return value * 60;
            case 's':
                return value;
            default:
                return 86400; // Default 24 hours
        }
    }
}

module.exports = AuthService;
