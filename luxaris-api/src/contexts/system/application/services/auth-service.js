const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { UserStatus } = require('../../domain/models/user');
const RoleRepository = require('../../infrastructure/persistence/role_repository');
const AclRepository = require('../../infrastructure/persistence/acl_repository');

class AuthService {
	constructor(user_repository, config, system_logger, event_registry) {
		this.user_repository = user_repository;
		this.config = config;
		this.system_logger = system_logger;
		this.event_registry = event_registry;
		this.role_repository = new RoleRepository(user_repository.db_pool);
		this.acl_repository = new AclRepository(user_repository.db_pool);
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

		// Auto-assign owner role if this is a root user
		if (user.is_root) {
			const owner_role = await this.role_repository.find_by_slug('owner');
			if (owner_role) {
				await this.acl_repository.assign_role(user.id, 'user', owner_role.id);
				await this.system_logger.info(
					'AuthService',
					'Owner role assigned to root user',
					{ user_id: user.id, role_id: owner_role.id }
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
