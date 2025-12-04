require('dotenv').config();

const { get_app_config, validate_app_config } = require('./config/app');
const { get_auth_config, validate_auth_config } = require('./config/auth');
const { create_database_pool, test_database_connection } = require('./config/database');
const { create_cache_client, test_cache_connection } = require('./config/cache');
const { create_queue_connection, declare_queues } = require('./config/queue');
const Server = require('./core/http/server');
const { get_logger } = require('./core/logging/system_logger');
const EventRegistry = require('./core/events/event-registry');
const { get_request_logger } = require('./core/http/middleware/request_logger');
const error_handler = require('./core/http/middleware/error-handler');
const not_found_handler = require('./core/http/middleware/not-found-handler');

// System context dependencies
const UserRepository = require('./contexts/system/infrastructure/repositories/user-repository');
const FeatureFlagRepository = require('./contexts/system/infrastructure/repositories/feature-flag-repository');
const AuthService = require('./contexts/system/application/services/auth-service');
const FeatureFlagService = require('./contexts/system/application/services/feature-flag-service');
const HealthCheckService = require('./contexts/system/application/services/health-check-service');
const RegisterUserUseCase = require('./contexts/system/application/use_cases/register-user');
const LoginUserUseCase = require('./contexts/system/application/use_cases/login-user');
const RefreshTokenUseCase = require('./contexts/system/application/use_cases/refresh-token');
const AuthHandler = require('./contexts/system/interface/http/handlers/auth-handler');
const OpsHandler = require('./contexts/system/interface/http/handlers/ops-handler');
const create_auth_routes = require('./contexts/system/interface/http/routes');
const create_ops_routes = require('./contexts/system/interface/http/ops-routes');
const { initialize_channels_domain } = require('./contexts/channels');
const { initialize_posts_domain } = require('./contexts/posts');
const { initialize_generation_domain } = require('./contexts/generation');
const { initialize_scheduling_domain } = require('./contexts/scheduling');

async function bootstrap() {
    let system_logger = null;
    let db_pool = null;
    let cache_client = null;
    let queue_connection = null;
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
      
            // Log successful shutdown BEFORE closing database
            if (system_logger) {
                await system_logger.info(
                    'Application',
                    'Luxaris API stopped successfully',
                    { signal }
                );
            }

            // Now close all connections
            if (db_pool) {
                await db_pool.end();
            }
            if (cache_client) {
                cache_client.end();
            }
            if (queue_connection) {
                await queue_connection.close();
            }

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

        // Initialize database
        db_pool = create_database_pool();
        await test_database_connection(db_pool);

        // Initialize logger early so we can use it for error logging
        system_logger = get_logger(db_pool);

        // Initialize cache
        cache_client = create_cache_client();
        await test_cache_connection(cache_client);

        // Initialize queue
        const queue_result = await create_queue_connection();
        queue_connection = queue_result.connection;
        const queue_channel = queue_result.channel;
        await declare_queues(queue_channel);

        // Initialize event infrastructure
        const event_registry = new EventRegistry(db_pool, system_logger);
        const request_logger = get_request_logger(db_pool);

        // Log application startup
        await system_logger.info(
            'Application',
            'Luxaris API starting',
            { version: app_config.api_version, node_env: app_config.node_env }
        );

        // Initialize HTTP server
        server = new Server(app_config);

        // Register request logger middleware
        server.register_middleware(request_logger.middleware());

        // Initialize system context
        const user_repository = new UserRepository(db_pool);
        const feature_flag_repository = new FeatureFlagRepository(db_pool);
    
        const auth_service = new AuthService(user_repository, auth_config, system_logger, event_registry);
        const feature_flag_service = new FeatureFlagService(feature_flag_repository, cache_client);
        const health_check_service = new HealthCheckService(db_pool, cache_client, queue_connection);
    
        const register_user_use_case = new RegisterUserUseCase(auth_service);
        const login_user_use_case = new LoginUserUseCase(auth_service);
        const refresh_token_use_case = new RefreshTokenUseCase(auth_service);
    
        const auth_handler = new AuthHandler(register_user_use_case, login_user_use_case, refresh_token_use_case);
        const ops_handler = new OpsHandler(health_check_service, feature_flag_service);

        // Initialize domains in correct order (respecting dependencies)
		
        // 1. Channels domain (depends only on system)
        const channels_domain = initialize_channels_domain({
            db_pool,
            system_logger,
            acl_service: auth_service.acl_service,
            event_registry
        });

        // 2. Posts domain (depends on channels for channel_service)
        const posts_domain = initialize_posts_domain({
            db_pool,
            system_logger,
            event_registry,
            channel_service: channels_domain.channel_service
        });

        // 3. Generation domain (depends on posts and channels)
        const generation_domain = initialize_generation_domain({
            db_pool,
            system_logger,
            event_registry,
            post_service: posts_domain.post_service,
            post_variant_service: posts_domain.post_variant_service,
            channel_service: channels_domain.channel_service
        });

        // 4. Scheduling domain (depends on posts)
        const scheduling_domain = initialize_scheduling_domain({
            db_pool,
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
                req.principal = principal;
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
        const auth_routes = create_auth_routes(auth_handler);
        const ops_routes = create_ops_routes(ops_handler);
    
        server.register_routes(`/api/${app_config.api_version}/auth`, auth_routes);
        server.register_routes(`/api/${app_config.api_version}/ops`, ops_routes);

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
            if (db_pool) {
                await db_pool.end();
            }
            if (cache_client) {
                cache_client.end();
            }
            if (queue_connection) {
                await queue_connection.close();
            }
        } catch (cleanup_error) {
            console.error('Error during cleanup:', cleanup_error);
        }

        process.exit(1);
    }
}

bootstrap();
