const Server = require('../../src/core/http/server');
const error_handler = require('../../src/core/http/middleware/error-handler-middleware');
const not_found_handler = require('../../src/core/http/middleware/not-found-handler-middleware');
const origin_validation = require('../../src/core/http/middleware/origin-validation-middleware');
const xss_sanitization = require('../../src/core/http/middleware/xss-sanitization-middleware');
const { get_auth_config } = require('../../src/config/auth');
const connection_manager = require('../../src/core/infrastructure/connection-manager');
const { get_logger } = require('../../src/core/logging/system_logger');
const { get_request_logger } = require('../../src/core/http/middleware/request-logger');
const EventRegistry = require('../../src/core/events/event-registry');
const UserRepository = require('../../src/contexts/system/infrastructure/repositories/user-repository');
const FeatureFlagRepository = require('../../src/contexts/system/infrastructure/repositories/feature-flag-repository');
const PresetRepository = require('../../src/contexts/system/infrastructure/repositories/preset-repository');
const AuthService = require('../../src/contexts/system/application/services/auth-service');
const FeatureFlagService = require('../../src/contexts/system/application/services/feature-flag-service');
const HealthCheckService = require('../../src/contexts/system/application/services/health-check-service');
const PresetService = require('../../src/contexts/system/application/services/preset-service');
const UserService = require('../../src/contexts/system/application/services/user-service');
const RegisterUserUseCase = require('../../src/contexts/system/application/use_cases/register-user');
const LoginUserUseCase = require('../../src/contexts/system/application/use_cases/login-user');
const RefreshTokenUseCase = require('../../src/contexts/system/application/use_cases/refresh-token');
const AuthHandler = require('../../src/contexts/system/interface/http/handlers/auth-handler');
const OpsHandler = require('../../src/contexts/system/interface/http/handlers/ops-handler');
const PresetHandler = require('../../src/contexts/system/interface/http/handlers/preset-handler');
const UserHandler = require('../../src/contexts/system/interface/http/handlers/user-handler');
const { create_auth_routes, create_preset_routes, create_user_routes } = require('../../src/contexts/system/interface/http/routes');
const create_ops_routes = require('../../src/contexts/system/interface/http/ops-routes');
const { initialize_posts_domain } = require('../../src/contexts/posts');
const { initialize_channels_domain } = require('../../src/contexts/channels');
const { initialize_generation_domain } = require('../../src/contexts/generation');
const { initialize_scheduling_domain } = require('../../src/contexts/scheduling');

class TestServer {

    constructor() {
        this.server = null;
        this.app = null;
    }

    async start(config = {}) {
        const default_config = {
            port: 0, // Random port for testing
            node_env: 'test',
            api_version: 'v1',
            cors_origin: '*',
            rate_limit_max_requests: 1000,
            rate_limit_window_ms: 60000
        };

        const merged_config = { ...default_config, ...config };
        const auth_config = get_auth_config();

        // Initialize connection manager (singleton)
        if (!connection_manager.is_initialized()) {
            await connection_manager.initialize();
        }

        // Initialize logging
        const system_logger = get_logger(connection_manager.get_db_pool());
        const event_registry = new EventRegistry(connection_manager.get_db_pool(), system_logger);
        const request_logger = get_request_logger(connection_manager.get_db_pool());

        this.server = new Server(merged_config);
        this.app = this.server.get_app();

        // Register security middleware (MUST be early in the stack)
        this.server.register_middleware(origin_validation);
        this.server.register_middleware(xss_sanitization);

        // Register request logger middleware
        this.server.register_middleware(request_logger.middleware());

        // Initialize system context
        const user_repository = new UserRepository();
        const feature_flag_repository = new FeatureFlagRepository();
        const preset_repository = new PresetRepository();
        const CacheService = require('../../src/contexts/system/infrastructure/cache/cache-service');
        const cache_service = new CacheService(connection_manager.get_cache_client());
		
        const auth_service = new AuthService(user_repository, auth_config, system_logger, event_registry);
        const feature_flag_service = new FeatureFlagService(feature_flag_repository, connection_manager.get_cache_client());
        const health_check_service = new HealthCheckService(connection_manager.get_db_pool(), connection_manager.get_cache_client(), null);
        const preset_service = new PresetService(preset_repository, event_registry, system_logger);
        const user_service = new UserService(user_repository);
        const GoogleOAuthService = require('../../src/contexts/system/application/services/google-oauth-service');
        const google_oauth_service = new GoogleOAuthService(auth_config, cache_service, system_logger);
		
        const register_user_use_case = new RegisterUserUseCase(auth_service);
        const login_user_use_case = new LoginUserUseCase(auth_service);
        const refresh_token_use_case = new RefreshTokenUseCase(auth_service);
		
        const auth_handler = new AuthHandler(
            register_user_use_case, 
            login_user_use_case, 
            refresh_token_use_case,
            google_oauth_service,
            auth_service,
            auth_config
        );
        const ops_handler = new OpsHandler(health_check_service, feature_flag_service);
        const preset_handler = new PresetHandler(preset_service);
        const user_handler = new UserHandler(user_service);

        // Create authentication middleware
        const auth_middleware = (req, res, next) => {
            const auth_header = req.headers.authorization;

            if (!auth_header || !auth_header.startsWith('Bearer ')) {
                return res.status(401).json({
                    errors: [{
                        error_code: 'UNAUTHORIZED',
                        error_description: 'Missing or invalid authorization header',
                        error_severity: 'error'
                    }]
                });
            }

            const token = auth_header.substring(7);

            try {
                const principal = auth_service.verify_token(token);
                // Map JWT payload to expected format
                req.user = {
                    id: principal.sub,
                    email: principal.email,
                    name: principal.name,
                    timezone: principal.timezone,
                    is_root: principal.is_root,
                    roles: principal.roles
                };
                // Add id property for convenience (JWT uses 'sub')
                req.principal = {
                    ...principal,
                    id: principal.sub
                };
                next();
            } catch (error) {
                return res.status(401).json({
                    errors: [{
                        error_code: 'INVALID_TOKEN',
                        error_description: 'Token is invalid or expired',
                        error_severity: 'error'
                    }]
                });
            }
        };

        // Register system context routes
        const auth_routes = create_auth_routes(auth_handler, auth_middleware);
        const ops_routes = create_ops_routes(ops_handler);
        const preset_routes = create_preset_routes(preset_handler, auth_middleware);
        const user_routes = create_user_routes(user_handler, auth_middleware);
		
        this.server.register_routes(`/api/${merged_config.api_version}/auth`, auth_routes);
        this.server.register_routes(`/api/${merged_config.api_version}/ops`, ops_routes);
        this.server.register_routes(`/api/${merged_config.api_version}/system`, preset_routes);
        this.server.register_routes(`/api/${merged_config.api_version}/system`, user_routes);

        // Initialize domains for testing
        const channels_domain = initialize_channels_domain({
            system_logger,
            acl_service: auth_service.acl_service,
            event_registry
        });

        const posts_domain = initialize_posts_domain({
            system_logger,
            event_registry,
            channel_service: channels_domain.channel_service
        });

        // Register posts domain routes
        const post_routes = posts_domain.create_post_routes({
            post_service: posts_domain.post_service,
            auth_middleware,
            error_handler
        });
        this.server.register_routes(`/api/${merged_config.api_version}/posts`, post_routes);

        const post_variant_routes = posts_domain.create_post_variant_routes({
            post_variant_service: posts_domain.post_variant_service,
            auth_middleware,
            error_handler
        });
        this.server.register_routes(`/api/${merged_config.api_version}`, post_variant_routes);

        // Register channels domain routes
        const channel_routes = channels_domain.create_channel_routes({
            channel_service: channels_domain.channel_service,
            channel_connection_service: channels_domain.channel_connection_service,
            auth_middleware,
            error_handler
        });
        this.server.register_routes(`/api/${merged_config.api_version}/channels`, channel_routes);

        // Initialize generation domain
        const generation_domain = initialize_generation_domain({
            system_logger,
            event_registry,
            post_service: posts_domain.post_service,
            post_variant_service: posts_domain.post_variant_service,
            channel_service: channels_domain.channel_service
        });

        // Register generation domain routes
        const post_template_routes = generation_domain.create_post_template_routes({
            post_template_service: generation_domain.post_template_service,
            auth_middleware,
            error_handler
        });
        this.server.register_routes(`/api/${merged_config.api_version}/templates`, post_template_routes);

        const generation_routes = generation_domain.create_generation_routes({
            generation_service: generation_domain.generation_service,
            auth_middleware,
            error_handler
        });
        this.server.register_routes(`/api/${merged_config.api_version}/generation`, generation_routes);

        // Initialize scheduling domain
        const scheduling_domain = initialize_scheduling_domain({
            system_logger,
            event_registry,
            post_variant_service: posts_domain.post_variant_service,
            post_repository: posts_domain.post_repository
        });

        // Register scheduling domain routes
        const schedule_routes = scheduling_domain.create_schedule_routes(
            scheduling_domain.schedule_service,
            auth_middleware
        );
        this.server.register_routes(`/api/${merged_config.api_version}/schedules`, schedule_routes);

        // Register error handlers
        this.server.register_middleware(not_found_handler);
        this.server.register_error_handler(error_handler);

        await this.server.start();

        return this.app;
    }

    async stop() {
        if (this.server) {
            await this.server.stop();
        }
        await connection_manager.shutdown();
    }

    get db_pool() {
        return connection_manager.get_db_pool();
    }

    get_app() {
        return this.app;
    }

    register_routes(path, router) {
        if (this.server) {
            this.server.register_routes(path, router);
        }
    }
}

module.exports = TestServer;
