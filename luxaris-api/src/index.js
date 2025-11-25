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

async function bootstrap() {
  try {
    // Load and validate configuration
    const app_config = get_app_config();
    const auth_config = get_auth_config();
    validate_app_config(app_config);
    validate_auth_config(auth_config);

    console.log(`Starting Luxaris API in ${app_config.node_env} mode...`);

    // Initialize database
    const db_pool = create_database_pool();
    await test_database_connection(db_pool);

    // Initialize cache
    const cache_client = create_cache_client();
    await test_cache_connection(cache_client);

    // Initialize queue
    const { connection: queue_connection, channel: queue_channel } = await create_queue_connection();
    await declare_queues(queue_channel);

    // Initialize logging and event infrastructure
    const system_logger = get_logger(db_pool);
    const event_registry = new EventRegistry(db_pool, system_logger);
    const request_logger = get_request_logger(db_pool);

    // Log application startup
    await system_logger.info(
      'Application',
      'Luxaris API starting',
      { version: app_config.api_version, node_env: app_config.node_env }
    );

    // Initialize HTTP server
    const server = new Server(app_config);

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

    // Register system context routes
    const auth_routes = create_auth_routes(auth_handler);
    const ops_routes = create_ops_routes(ops_handler);
    
    server.register_routes(`/api/${app_config.api_version}/auth`, auth_routes);
    server.register_routes(`/api/${app_config.api_version}/ops`, ops_routes);

    // TODO: Register posts context routes

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

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      await system_logger.info(
        'Application',
        'Luxaris API shutting down',
        { signal }
      );

      await server.stop();
      await db_pool.end();
      cache_client.end();
      await queue_connection.close();

      console.log('Luxaris API stopped');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start Luxaris API:', error);
    process.exit(1);
  }
}

bootstrap();
