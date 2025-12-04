const { get_app_config } = require('../../../../config/app');

class HealthCheckService {
    constructor(db_pool, cache_client, queue_connection) {
        this.db_pool = db_pool;
        this.cache = cache_client;
        this.queue = queue_connection;
    }

    async check_health() {
        const checks = {};
        let overall_status = 'healthy';

        // Check database
        checks.database = await this._check_database();
        if (checks.database !== 'ok') {
            overall_status = 'unhealthy';
        }

        // Check cache
        checks.cache = await this._check_cache();
        if (checks.cache !== 'ok') {
            overall_status = overall_status === 'healthy' ? 'degraded' : 'unhealthy';
        }

        // Check queue (if configured)
        if (this.queue) {
            checks.queue = await this._check_queue();
            if (checks.queue !== 'ok') {
                overall_status = overall_status === 'healthy' ? 'degraded' : 'unhealthy';
            }
        }

        return {
            status: overall_status,
            checks
        };
    }

    async get_status() {
        const app_config = get_app_config();
        const health = await this.check_health();

        return {
            ...health,
            version: app_config.api_version,
            environment: app_config.node_env,
            timestamp: new Date().toISOString()
        };
    }

    async _check_database() {
        try {
            await this.db_pool.query('SELECT 1');
            return 'ok';
        } catch (error) {
            console.error('Database health check failed:', error.message);
            return 'error';
        }
    }

    async _check_cache() {
        try {
            if (!this.cache) {
                return 'not_configured';
            }

            // Try to set and get a test value
            const test_key = 'health_check_test';
            const test_value = Date.now().toString();
			
            await this.cache.set(test_key, test_value, 10);
            const retrieved = await this.cache.get(test_key);
            await this.cache.del(test_key);

            if (retrieved === test_value) {
                return 'ok';
            }
            return 'error';
        } catch (error) {
            console.error('Cache health check failed:', error.message);
            return 'error';
        }
    }

    async _check_queue() {
        try {
            if (!this.queue || !this.queue.connection) {
                return 'not_configured';
            }

            // Check if connection is open
            if (this.queue.connection.connection && 
			    this.queue.connection.connection.stream && 
			    this.queue.connection.connection.stream.writable) {
                return 'ok';
            }
            return 'error';
        } catch (error) {
            console.error('Queue health check failed:', error.message);
            return 'error';
        }
    }
}

module.exports = HealthCheckService;
