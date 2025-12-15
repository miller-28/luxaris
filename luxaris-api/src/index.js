require('dotenv').config();

const { get_app_config, validate_app_config } = require('./config/app');
const { get_auth_config, validate_auth_config } = require('./config/auth');
const connection_manager = require('./core/infrastructure/connection-manager');
const Server = require('./core/http/server');
const { get_logger } = require('./core/logging/system_logger');
const EventRegistry = require('./core/events/event-registry');
const { get_request_logger } = require('./core/http/middleware/request_logger');
const error_handler = require('./core/http/middleware/error-handler');
const not_found_handler = require('./core/http/middleware/not-found-handler');
const origin_validation = require('./core/http/middleware/origin-validation');
const xss_sanitization = require('./core/http/middleware/xss-sanitization');

// System context dependencies
const UserRepository = require('./contexts/system/infrastructure/repositories/user-repository');
const FeatureFlagRepository = require('./contexts/system/infrastructure/repositories/feature-flag-repository');
const PresetRepository = require('./contexts/system/infrastructure/repositories/preset-repository');
const CacheService = require('./contexts/system/infrastructure/cache/cache-service');
const AuthService = require('./contexts/system/application/services/auth-service');
const FeatureFlagService = require('./contexts/system/application/services/feature-flag-service');
const HealthCheckService = require('./contexts/system/application/services/health-check-service');
const GoogleOAuthService = require('./contexts/system/application/services/google-oauth-service');
const PresetService = require('./contexts/system/application/services/preset-service');
const UserService = require('./contexts/system/application/services/user-service');
const RegisterUserUseCase = require('./contexts/system/application/use_cases/register-user');
const LoginUserUseCase = require('./contexts/system/application/use_cases/login-user');
const RefreshTokenUseCase = require('./contexts/system/application/use_cases/refresh-token');
const AuthHandler = require('./contexts/system/interface/http/handlers/auth-handler');
const OpsHandler = require('./contexts/system/interface/http/handlers/ops-handler');
const PresetHandler = require('./contexts/system/interface/http/handlers/preset-handler');
const UserHandler = require('./contexts/system/interface/http/handlers/user-handler');
const { create_auth_routes, create_preset_routes, create_user_routes } = require('./contexts/system/interface/http/routes');
const create_ops_routes = require('./contexts/system/interface/http/ops-routes');
const { initialize_channels_domain } = require('./contexts/channels');
const { initialize_posts_domain } = require('./contexts/posts');
const { initialize_generation_domain } = require('./contexts/generation');
const { initialize_scheduling_domain } = require('./contexts/scheduling');

async function bootstrap() {
    let system_logger = null;
    let server = null;

    // Graceful shutdown handler
    const shutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down gracefully...`);

        try {
            if (system_logger) {
                await system_logger.info(
                    'Application',
                    'Luxaris API shutting down',
                    { signal }
                );
            }

            if (server) {
                await server.stop();
            }
      
            // Log successful shutdown BEFORE closing connections
            if (system_logger) {
                await system_logger.info(
                    'Application',
                    'Luxaris API stopped successfully',
                    { signal }
                );
            }

            // Shutdown all connections via connection manager
            await connection_manager.shutdown();

            console.log('Luxaris API stopped');
            process.exit(0);
        } catch (shutdown_error) {
            console.error('Error during shutdown:', shutdown_error);
            process.exit(1);
        }
    };

    // Register shutdown handlers early
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGBREAK', () => shutdown('SIGBREAK')); // Windows Ctrl+Break
  
    // Handle process exit (for debugging stops)
    process.on('exit', (code) => {
        console.log(`Process exiting with code: ${code}`);
    });

    // Handle before exit (last chance for async operations)
    process.on('beforeExit', async (code) => {
        if (code === 0 && system_logger) {
            try {
                await system_logger.info(
                    'Application',
                    'Luxaris API process exiting',
                    { exit_code: code }
                );
            } catch (err) {
                console.error('Failed to log process exit:', err);
            }
        }
    });

    try {
        // Load and validate configuration
        const app_config = get_app_config();
        const auth_config = get_auth_config();
        validate_app_config(app_config);
        validate_auth_config(auth_config);

        console.log(`Starting Luxaris API in ${app_config.node_env} mode...`);

        // Initialize all connections via connection manager
        await connection_manager.initialize();

        // Initialize logger early so we can use it for error logging
        system_logger = get_logger(connection_manager.get_db_pool());

        // Initialize event infrastructure
        const event_registry = new EventRegistry(connection_manager.get_db_pool(), system_logger);
        const request_logger = get_request_logger(connection_manager.get_db_pool());

        // Log application startup
        await system_logger.info(
            'Application',
            'Luxaris API starting',
            { version: app_config.api_version, node_env: app_config.node_env }
        );

        // Initialize HTTP server
        server = new Server(app_config);

        // Store event emitter in app locals for middleware access
        server.get_app().locals.event_emitter = event_registry;

        // Register security middleware (MUST be early in the stack)
        server.register_middleware(origin_validation);
        server.register_middleware(xss_sanitization);

        // Register request logger middleware
        server.register_middleware(request_logger.middleware());

        // Initialize system context
        const user_repository = new UserRepository();
        const feature_flag_repository = new FeatureFlagRepository();
        const preset_repository = new PresetRepository();
        const cache_service = new CacheService(connection_manager.get_cache_client());
    
        const auth_service = new AuthService(user_repository, auth_config, system_logger, event_registry);
        const feature_flag_service = new FeatureFlagService(feature_flag_repository, connection_manager.get_cache_client());
        const health_check_service = new HealthCheckService(connection_manager.get_db_pool(), connection_manager.get_cache_client(), connection_manager.get_queue_connection());
        const google_oauth_service = new GoogleOAuthService(auth_config, cache_service, system_logger);
        const preset_service = new PresetService(preset_repository, event_registry, system_logger);
        const user_service = new UserService(user_repository);
    
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

        // Initialize domains in correct order (respecting dependencies)
		
        // 1. Channels domain (depends only on system)
        const channels_domain = initialize_channels_domain({
            system_logger,
            acl_service: auth_service.acl_service,
            event_registry
        });

        // 2. Posts domain (depends on channels for channel_service)
        const posts_domain = initialize_posts_domain({
            system_logger,
            event_registry,
            channel_service: channels_domain.channel_service
        });

        // 3. Generation domain (depends on posts and channels)
        const generation_domain = initialize_generation_domain({
            system_logger,
            event_registry,
            post_service: posts_domain.post_service,
            post_variant_service: posts_domain.post_variant_service,
            channel_service: channels_domain.channel_service
        });

        // 4. Scheduling domain (depends on posts)
        const scheduling_domain = initialize_scheduling_domain({
            system_logger,
            event_registry,
            post_variant_service: posts_domain.post_variant_service,
            post_repository: posts_domain.post_repository
        });

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
                console.error('[Auth Middleware] Token verification failed:', {
                    error: error.message,
                    tokenPreview: token.substring(0, 20) + '...',
                    url: req.url,
                    method: req.method
                });
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
    
        server.register_routes(`/api/${app_config.api_version}/auth`, auth_routes);
        server.register_routes(`/api/${app_config.api_version}/ops`, ops_routes);
        server.register_routes(`/api/${app_config.api_version}/system`, preset_routes);
        server.register_routes(`/api/${app_config.api_version}/system`, user_routes);

        // Register channels domain routes
        const channel_routes = channels_domain.create_channel_routes({
            channel_service: channels_domain.channel_service,
            channel_connection_service: channels_domain.channel_connection_service,
            auth_middleware,
            error_handler
        });
        server.register_routes(`/api/${app_config.api_version}/channels`, channel_routes);

        // Register posts domain routes
        const post_routes = posts_domain.create_post_routes({
            post_service: posts_domain.post_service,
            auth_middleware,
            error_handler
        });
        server.register_routes(`/api/${app_config.api_version}/posts`, post_routes);

        const post_variant_routes = posts_domain.create_post_variant_routes({
            post_variant_service: posts_domain.post_variant_service,
            auth_middleware,
            error_handler
        });
        server.register_routes(`/api/${app_config.api_version}`, post_variant_routes);

        // Register generation domain routes
        const post_template_routes = generation_domain.create_post_template_routes({
            post_template_service: generation_domain.post_template_service,
            auth_middleware,
            error_handler
        });
        server.register_routes(`/api/${app_config.api_version}/templates`, post_template_routes);

        const generation_routes = generation_domain.create_generation_routes({
            generation_service: generation_domain.generation_service,
            auth_middleware,
            error_handler
        });
        server.register_routes(`/api/${app_config.api_version}/generation`, generation_routes);

        // Register scheduling domain routes
        const schedule_routes = scheduling_domain.create_schedule_routes(
            scheduling_domain.schedule_service,
            auth_middleware
        );
        server.register_routes(`/api/${app_config.api_version}/schedules`, schedule_routes);

        // Register error handlers (must be last)
        server.register_middleware(not_found_handler);
        server.register_error_handler(error_handler);

        // Start server
        await server.start();

        await system_logger.info(
            'Application',
            'Luxaris API started successfully',
            { port: app_config.port }
        );

    } catch (error) {
        console.error('Failed to start Luxaris API:', error);

        // Log to system_logs if logger is available
        if (system_logger) {
            try {
                await system_logger.critical(
                    'Application',
                    'Luxaris API failed to start',
                    error,
                    {
                        error_message: error.message,
                        error_stack: error.stack,
                        error_code: error.code
                    }
                );
            } catch (log_error) {
                console.error('Failed to log startup error to database:', log_error);
            }
        }

        // Cleanup resources
        try {
            await connection_manager.shutdown();
        } catch (cleanup_error) {
            console.error('Error during cleanup:', cleanup_error);
        }

        process.exit(1);
    }
}

bootstrap();
