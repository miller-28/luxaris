const winston = require('winston');
const { create_database_pool, test_database_connection } = require('../../connections/database');
const { create_cache_client, test_cache_connection } = require('../../connections/cache');
const { create_queue_connection, declare_queues } = require('../../connections/queue');
const { create_mongodb_client, connect_mongodb, test_mongodb_connection, get_mongodb_database, get_mongodb_collection } = require('../../connections/mongodb');
const { create_redis_client, connect_redis, test_redis_connection } = require('../../connections/redis');

/**
 * Connection Manager
 * 
 * Centralized management of all infrastructure connections (database, cache, queue).
 * Provides singleton access to connections throughout the application runtime.
 * 
 * Multi-tenancy ready: Supports schema-aware database queries for future tenant isolation.
 */
class ConnectionManager {
    
    constructor() {

        this._db_pool = null;
        this._cache_client = null;
        this._queue_connection = null;
        this._queue_channel = null;
        this._mongodb_client = null;
        this._redis_client = null;
        this._initialized = false;
        this._default_schema = 'luxaris'; // Current single-tenant schema
        
        // Winston logger for query logging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.printf(({ timestamp, message }) => {
                            return `${timestamp} \x1b[33m[query]\x1b[0m: ${message}`;
                        })
                    )
                })
            ]
        });
    }

    /**
     * Initialize all connections
     * Must be called during application bootstrap before any database operations
     * Idempotent - safe to call multiple times (will skip if already initialized)
     */
    async initialize() {

        if (this._initialized) {
            return; // Already initialized - skip
        }

        // Initialize database pool
        this._db_pool = create_database_pool();
        await test_database_connection(this._db_pool);

        // Initialize cache client
        this._cache_client = create_cache_client();
        await test_cache_connection(this._cache_client);

        // Initialize queue connection
        const queue_result = await create_queue_connection();
        this._queue_connection = queue_result.connection;
        this._queue_channel = queue_result.channel;
        await declare_queues(this._queue_channel);

        // Initialize MongoDB client
        this._mongodb_client = create_mongodb_client();
        await connect_mongodb(this._mongodb_client);
        await test_mongodb_connection(this._mongodb_client);

        // Initialize Redis client
        this._redis_client = create_redis_client();
        await connect_redis(this._redis_client);
        await test_redis_connection(this._redis_client);

        this._initialized = true;
    }

    /**
     * Get database pool
     * For multi-tenancy: Use query_with_schema() instead of direct pool access
     * 
     * @returns {Pool} PostgreSQL connection pool with query logging
     */
    get_db_pool() {

        if (!this._db_pool) {
            throw new Error('Database pool not initialized. Call ConnectionManager.initialize() first.');
        }
        
        // Wrap pool to log queries
        if (!this._db_pool._query_logged) {
            const original_query = this._db_pool.query.bind(this._db_pool);
            this._db_pool.query = async (text, params) => {
                const start_time = Date.now();
                
                try {
                    const result = await original_query(text, params);
                    const duration = Date.now() - start_time;
                    
                    // Replace placeholders with actual values for logging
                    let query_with_values = text;
                    if (params && params.length > 0) {
                        params.forEach((param, index) => {
                            const placeholder = `$${index + 1}`;
                            const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                            query_with_values = query_with_values.replace(placeholder, value);
                        });
                    }
                    
                    this.logger.info(`[Query] ${query_with_values.replace(/\s+/g, ' ').trim()} | Duration: ${duration}ms`);
                    return result;
                } catch (error) {
                    const duration = Date.now() - start_time;
                    
                    // Replace placeholders with actual values for error logging
                    let query_with_values = text;
                    if (params && params.length > 0) {
                        params.forEach((param, index) => {
                            const placeholder = `$${index + 1}`;
                            const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                            query_with_values = query_with_values.replace(placeholder, value);
                        });
                    }
                    
                    // Log error in red with timestamp
                    console.error(`${new Date().toISOString()} \x1b[31m[query-error]\x1b[0m ${query_with_values.replace(/\s+/g, ' ').trim()} | Duration: ${duration}ms | Error: ${error.message}`);
                    throw error;
                }
            };
            this._db_pool._query_logged = true;
        }
        
        return this._db_pool;
    }

    /**
     * Execute query with schema awareness (multi-tenancy ready)
     * 
     * Current: Uses default 'luxaris' schema
     * Future: Will accept tenant_id to determine schema dynamically
     * 
     * @param {string} query - SQL query with schema placeholder or explicit schema
     * @param {Array} params - Query parameters
     * @param {Object} options - Query options
     * @param {string} options.schema - Override schema (for multi-tenant future)
     * @returns {Promise<Object>} Query result
     * 
     * @example
     * // Current usage (single tenant)
     * const result = await connection_manager.query('SELECT * FROM users WHERE id = $1', [user_id]);
     * 
     * @example
     * // Future usage (multi-tenant)
     * const result = await connection_manager.query(
     *   'SELECT * FROM users WHERE id = $1', 
     *   [user_id],
     *   { schema: tenant.schema_name }
     * );
     */
    async query(sql, params = [], options = {}) {

        const db_pool = this.get_db_pool();
        const schema = options.schema || this._default_schema;

        // Set search_path for this query (tenant isolation)
        // This ensures all queries run in the correct schema without modifying SQL
        const start_time = Date.now();
        const client = await db_pool.connect();
        try {
            await client.query(`SET search_path TO ${schema}`);
            const result = await client.query(sql, params);
            const duration = Date.now() - start_time;
            
            // Replace placeholders with actual values for logging
            let query_with_values = sql;
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    const placeholder = `$${index + 1}`;
                    const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                    query_with_values = query_with_values.replace(placeholder, value);
                });
            }
            
            console.log(`[DB] ${duration}ms | ${query_with_values}`);
            return result;
        } catch (error) {
            const duration = Date.now() - start_time;
            
            // Replace placeholders with actual values for error logging
            let query_with_values = sql;
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    const placeholder = `$${index + 1}`;
                    const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                    query_with_values = query_with_values.replace(placeholder, value);
                });
            }
            
            console.error(`${new Date().toISOString()} \x1b[31m[query-error]\x1b[0m ${duration}ms | ${query_with_values} | Error: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Execute transaction with schema awareness
     * 
     * @param {Function} callback - Transaction callback function receiving client
     * @param {Object} options - Transaction options
     * @param {string} options.schema - Override schema (for multi-tenant future)
     * @returns {Promise<any>} Transaction result
     * 
     * @example
     * await connection_manager.transaction(async (client) => {
     *   await client.query('INSERT INTO users ...', []);
     *   await client.query('INSERT INTO profiles ...', []);
     * });
     */
    async transaction(callback, options = {}) {

        const db_pool = this.get_db_pool();
        const schema = options.schema || this._default_schema;

        // Generate short transaction ID (8 chars)
        const tx_id = Math.random().toString(36).substring(2, 10);

        const client = await db_pool.connect();
        
        // Wrap client query to log transaction queries
        const original_client_query = client.query.bind(client);
        client.query = async (text, params) => {
            const start_time = Date.now();
            
            try {
                const result = await original_client_query(text, params);
                const duration = Date.now() - start_time;
                
                // Replace placeholders with actual values for logging
                let query_with_values = text;
                if (params && params.length > 0) {
                    params.forEach((param, index) => {
                        const placeholder = `$${index + 1}`;
                        const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                        query_with_values = query_with_values.replace(placeholder, value);
                    });
                }
                
                console.log(`[DB TX:${tx_id}] ${duration}ms | ${query_with_values}`);
                return result;
            } catch (error) {
                const duration = Date.now() - start_time;
                
                // Replace placeholders with actual values for error logging
                let query_with_values = text;
                if (params && params.length > 0) {
                    params.forEach((param, index) => {
                        const placeholder = `$${index + 1}`;
                        const value = typeof param === 'string' ? `'${param}'` : (param === null ? 'NULL' : param);
                        query_with_values = query_with_values.replace(placeholder, value);
                    });
                }
                
                console.error(`${new Date().toISOString()} \x1b[31m[query-error TX:${tx_id}]\x1b[0m ${duration}ms | ${query_with_values} | Error: ${error.message}`);
                throw error;
            }
        };
        
        try {
            await client.query('BEGIN');
            await client.query(`SET search_path TO ${schema}`);
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get cache client
     * 
     * @returns {RedisClient} Redis cache client
     */
    get_cache_client() {
        if (!this._cache_client) {
            throw new Error('Cache client not initialized. Call ConnectionManager.initialize() first.');
        }
        return this._cache_client;
    }

    /**
     * Get queue connection
     * 
     * @returns {Connection} RabbitMQ connection
     */
    get_queue_connection() {
        if (!this._queue_connection) {
            throw new Error('Queue connection not initialized. Call ConnectionManager.initialize() first.');
        }
        return this._queue_connection;
    }

    /**
     * Get queue channel
     * 
     * @returns {Channel} RabbitMQ channel
     */
    get_queue_channel() {
        if (!this._queue_channel) {
            throw new Error('Queue channel not initialized. Call ConnectionManager.initialize() first.');
        }
        return this._queue_channel;
    }

    /**
     * Get MongoDB client
     * 
     * @returns {MongoClient} MongoDB client
     */
    get_mongodb_client() {
        if (!this._mongodb_client) {
            throw new Error('MongoDB client not initialized. Call ConnectionManager.initialize() first.');
        }
        return this._mongodb_client;
    }

    /**
     * Get MongoDB database
     * 
     * @param {string} database_name - Optional database name (defaults to env variable)
     * @returns {Db} MongoDB database instance
     */
    get_mongodb_database(database_name = null) {
        const client = this.get_mongodb_client();
        return get_mongodb_database(client, database_name);
    }

    /**
     * Get MongoDB collection
     * 
     * @param {string} collection_name - Collection name
     * @param {string} database_name - Optional database name
     * @returns {Collection} MongoDB collection instance
     */
    get_mongodb_collection(collection_name, database_name = null) {
        const client = this.get_mongodb_client();
        return get_mongodb_collection(client, collection_name, database_name);
    }

    /**
     * Get Redis client
     * 
     * @returns {Object} Redis client
     */
    get_redis_client() {
        if (!this._redis_client) {
            throw new Error('Redis client not initialized. Call ConnectionManager.initialize() first.');
        }
        return this._redis_client;
    }

    /**
     * Check if connections are initialized
     * 
     * @returns {boolean} True if initialized
     */
    is_initialized() {
        return this._initialized;
    }

    /**
     * Gracefully shutdown all connections
     * Should be called during application shutdown
     * Closes database pool, cache client, and queue connection
     */
    async shutdown() {
        
        const errors = [];

        // Close database pool
        if (this._db_pool) {
            try {
                await this._db_pool.end();
                this._db_pool = null;
            } catch (error) {
                errors.push({ connection: 'database', error });
            }
        }

        // Close cache client
        if (this._cache_client) {
            try {
                this._cache_client.end();
                this._cache_client = null;
            } catch (error) {
                errors.push({ connection: 'cache', error });
            }
        }

        // Close queue connection
        if (this._queue_connection) {
            try {
                // Remove event listeners before closing to prevent hanging
                this._queue_connection.removeAllListeners();
                if (this._queue_channel) {
                    await this._queue_channel.close();
                    this._queue_channel = null;
                }
                await this._queue_connection.close();
                this._queue_connection = null;
            } catch (error) {
                errors.push({ connection: 'queue', error });
            }
        }

        // Close MongoDB client
        if (this._mongodb_client) {
            try {
                await this._mongodb_client.close();
                this._mongodb_client = null;
            } catch (error) {
                errors.push({ connection: 'mongodb', error });
            }
        }

        // Close Redis client
        if (this._redis_client) {
            try {
                await this._redis_client.quit();
                this._redis_client = null;
            } catch (error) {
                errors.push({ connection: 'redis', error });
            }
        }

        this._initialized = false;

        if (errors.length > 0) {
            const error = new Error('Failed to shutdown some connections');
            error.details = errors;
            console.error('Shutdown errors:', JSON.stringify(errors.map(e => ({
                connection: e.connection,
                message: e.error.message,
                code: e.error.code
            })), null, 2));
            throw error;
        }
    }

    /**
     * Get connection health status
     * 
     * @returns {Object} Health status of all connections
     */
    get_health_status() {
        return {
            database: this._db_pool !== null,
            cache: this._cache_client !== null,
            queue: this._queue_connection !== null,
            mongodb: this._mongodb_client !== null,
            redis: this._redis_client !== null && this._redis_client.isOpen,
            initialized: this._initialized
        };
    }
}

// Export singleton instance
const connection_manager = new ConnectionManager();

module.exports = connection_manager;
