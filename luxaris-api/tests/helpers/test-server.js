const Server = require('../../src/core/http/server');
const error_handler = require('../../src/core/http/middleware/error-handler');
const not_found_handler = require('../../src/core/http/middleware/not-found-handler');
const { get_auth_config } = require('../../src/config/auth');
const { create_database_pool } = require('../../src/config/database');
const { create_cache_client } = require('../../src/config/cache');
const { get_logger } = require('../../src/core/logging/system_logger');
const { get_request_logger } = require('../../src/core/http/middleware/request_logger');
const EventRegistry = require('../../src/core/events/event-registry');
const UserRepository = require('../../src/contexts/system/infrastructure/repositories/user-repository');
const FeatureFlagRepository = require('../../src/contexts/system/infrastructure/repositories/feature-flag-repository');
const AuthService = require('../../src/contexts/system/application/services/auth-service');
const FeatureFlagService = require('../../src/contexts/system/application/services/feature-flag-service');
const HealthCheckService = require('../../src/contexts/system/application/services/health-check-service');
const RegisterUserUseCase = require('../../src/contexts/system/application/use_cases/register-user');
const LoginUserUseCase = require('../../src/contexts/system/application/use_cases/login-user');
const RefreshTokenUseCase = require('../../src/contexts/system/application/use_cases/refresh-token');
const AuthHandler = require('../../src/contexts/system/interface/http/handlers/auth-handler');
const OpsHandler = require('../../src/contexts/system/interface/http/handlers/ops-handler');
const create_auth_routes = require('../../src/contexts/system/interface/http/routes');
const create_ops_routes = require('../../src/contexts/system/interface/http/ops-routes');

class TestServer {
    constructor() {
        this.server = null;
        this.app = null;
        this.db_pool = null;
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

        // Initialize database pool
        this.db_pool = create_database_pool();

        // Initialize cache
        this.cache_client = create_cache_client();

        // Initialize logging
        const system_logger = get_logger(this.db_pool);
        const event_registry = new EventRegistry(this.db_pool, system_logger);
        const request_logger = get_request_logger(this.db_pool);

        this.server = new Server(merged_config);
        this.app = this.server.get_app();

        // Register request logger middleware
        this.server.register_middleware(request_logger.middleware());

        // Initialize system context
        const user_repository = new UserRepository(this.db_pool);
        const feature_flag_repository = new FeatureFlagRepository(this.db_pool);
		
        const auth_service = new AuthService(user_repository, auth_config, system_logger, event_registry);
        const feature_flag_service = new FeatureFlagService(feature_flag_repository, this.cache_client);
        const health_check_service = new HealthCheckService(this.db_pool, this.cache_client, null);
		
        const register_user_use_case = new RegisterUserUseCase(auth_service);
        const login_user_use_case = new LoginUserUseCase(auth_service);
        const refresh_token_use_case = new RefreshTokenUseCase(auth_service);
		
        const auth_handler = new AuthHandler(register_user_use_case, login_user_use_case, refresh_token_use_case);
        const ops_handler = new OpsHandler(health_check_service, feature_flag_service);

        // Register system context routes
        const auth_routes = create_auth_routes(auth_handler);
        const ops_routes = create_ops_routes(ops_handler);
		
        this.server.register_routes(`/api/${merged_config.api_version}/auth`, auth_routes);
        this.server.register_routes(`/api/${merged_config.api_version}/ops`, ops_routes);

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
        if (this.db_pool) {
            await this.db_pool.end();
        }
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
