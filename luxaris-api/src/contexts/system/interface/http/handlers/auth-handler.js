class AuthHandler {
    constructor(
        register_user_use_case, 
        login_user_use_case, 
        refresh_token_use_case,
        google_oauth_service,
        auth_service,
        config
    ) {
        this.register_user_use_case = register_user_use_case;
        this.login_user_use_case = login_user_use_case;
        this.refresh_token_use_case = refresh_token_use_case;
        this.google_oauth_service = google_oauth_service;
        this.auth_service = auth_service;
        this.config = config;
    }

    async register(req, res, next) {
        try {
            const result = await this.register_user_use_case.execute(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            // Extract request metadata for session
            const metadata = {
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'] || '',
                client_type_header: req.headers['x-client-type'] || '' // Custom header for site detection
            };
            
            const result = await this.login_user_use_case.execute(req.body, metadata);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const result = await this.refresh_token_use_case.execute(req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            console.log('[AuthHandler] Logout request received', {
                userId: req.user?.id,
                sessionId: req.session_id
            });
            
            // Delete session from Redis
            if (req.session_id) {
                await this.auth_service.delete_session(req.session_id);
            }
            
            return res.status(200).json({
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('[AuthHandler] Logout error:', error);
            next(error);
        }
    }

    async get_current_user(req, res, next) {
        try {
            // req.user is populated by auth middleware
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    errors: [{
                        error_code: 'UNAUTHORIZED',
                        error_description: 'User not authenticated',
                        error_severity: 'error'
                    }]
                });
            }

            // Return explicit user properties (never include password_hash)
            res.status(200).json({
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
                auth_method: user.auth_method,
                status: user.status,
                is_root: user.is_root,
                timezone: user.timezone,
                locale: user.locale,
                roles: user.roles || [],
                permissions: user.permissions || [],
                created_at: user.created_at,
                last_login_at: user.last_login_at
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Initiate Google OAuth flow
     * GET /auth/google
     */
    async google_authorize(req, res, next) {
        try {
            // Generate authorization URL with state
            const { url, state } = await this.google_oauth_service.generate_authorization_url();

            // Redirect to Google consent screen
            res.redirect(url);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Google OAuth callback
     * GET /auth/google/callback?code=xxx&state=xxx
     */
    async google_callback(req, res, next) {
        try {
            const { code, state } = req.query;

            // Validate required parameters
            if (!code) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_AUTHORIZATION_CODE',
                        error_description: 'Authorization code is required',
                        error_severity: 'error'
                    }]
                });
            }

            if (!state) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_STATE_PARAMETER',
                        error_description: 'State parameter is required',
                        error_severity: 'error'
                    }]
                });
            }

            // Complete OAuth flow (exchange code, fetch user info)
            const { token_data, user_info } = await this.google_oauth_service.complete_oauth_flow(
                code,
                state
            );

            // Register or login user
            const result = await this.auth_service.register_oauth_user({
                provider_key: 'google',
                provider_user_id: user_info.provider_user_id,
                email: user_info.email,
                name: user_info.name,
                avatar_url: user_info.avatar_url,
                token_data: token_data,
                metadata: {
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent'] || '',
                    client_type_header: req.headers['x-client-type'] || '' // Custom header for site detection
                }
            });

            // Build redirect URL based on approval status
            const frontend_url = process.env.FRONTEND_URL || 'http://localhost:5173';
            
            if (result.needs_approval) {
                // Redirect to pending approval page
                const redirect_url = `${frontend_url}/auth/pending-approval?email=${encodeURIComponent(result.user.email)}`;
                return res.redirect(redirect_url);
            }

            // Redirect to callback with session_id
            const redirect_url = `${frontend_url}/auth/google/callback?success=true&session_id=${result.session_id}`;
            res.redirect(redirect_url);

        } catch (error) {
            // Redirect to error page
            const frontend_url = process.env.FRONTEND_URL || 'http://localhost:5173';
            const error_message = encodeURIComponent(error.message || 'OAuth authentication failed');
            const redirect_url = `${frontend_url}/auth/google/callback?success=false&error=${error_message}`;
            res.redirect(redirect_url);
        }
    }
}

module.exports = AuthHandler;
