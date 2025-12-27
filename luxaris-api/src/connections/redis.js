const redis = require('redis');

let redis_client = null;

/**
 * Create Redis client with configuration
 * @returns {Object} Redis client instance
 */
function create_redis_client() {
    const config = {
        url: process.env.REDIS_URL || build_redis_url(),
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    console.error('Redis: Max reconnection attempts reached');
                    return new Error('Redis: Max reconnection attempts reached');
                }
                // Exponential backoff: 50ms, 100ms, 200ms, etc.
                return Math.min(retries * 50, 3000);
            },
            connectTimeout: 10000,
        },
        // Enable automatic reconnection
        enableAutoPipelining: true,
        // Disable offline queue to fail fast
        enableOfflineQueue: false,
    };

    redis_client = redis.createClient(config);

    // Event handlers
    redis_client.on('error', (error) => {
        console.error('Redis client error:', error);
    });

    redis_client.on('connect', () => {
        console.log('Redis client connected');
    });

    redis_client.on('ready', () => {
        console.log('Redis client ready');
    });

    redis_client.on('reconnecting', () => {
        console.log('Redis client reconnecting...');
    });

    redis_client.on('end', () => {
        console.log('Redis client connection closed');
    });

    return redis_client;
}

/**
 * Build Redis connection URL from environment variables
 * @returns {string} Redis connection URL
 */
function build_redis_url() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT || 6379;
    const user = process.env.REDIS_USER || 'default';
    const password = process.env.REDIS_PASSWORD;
    const db = process.env.REDIS_DB || 0;

    if (password) {
        return `redis://${user}:${password}@${host}:${port}/${db}`;
    }
    
    return `redis://${host}:${port}/${db}`;
}

/**
 * Connect to Redis server
 * @param {Object} client - Redis client instance
 * @returns {Promise<void>}
 */
async function connect_redis(client) {
    try {
        await client.connect();
        console.log('Redis connected successfully');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
}

/**
 * Test Redis connection by setting and getting a value
 * @param {Object} client - Redis client instance
 * @returns {Promise<void>}
 */
async function test_redis_connection(client) {
    try {
        const test_key = 'luxaris:connection_test';
        const test_value = 'ok';
        
        await client.set(test_key, test_value, { EX: 10 }); // Expire in 10 seconds
        const result = await client.get(test_key);
        
        if (result === test_value) {
            console.log('Redis connection test successful');
            await client.del(test_key); // Clean up
        } else {
            throw new Error('Redis connection test failed: value mismatch');
        }
    } catch (error) {
        console.error('Redis connection test failed:', error);
        throw error;
    }
}

/**
 * Close Redis client connection
 * @param {Object} client - Redis client instance
 * @returns {Promise<void>}
 */
async function close_redis_client(client) {
    if (client && client.isOpen) {
        try {
            await client.quit();
            console.log('Redis client closed gracefully');
        } catch (error) {
            console.error('Error closing Redis client:', error);
            // Force close if graceful shutdown fails
            await client.disconnect();
        }
    }
}

/**
 * Get Redis client instance
 * @returns {Object} Redis client instance
 */
function get_redis_client() {
    if (!redis_client) {
        throw new Error('Redis client not initialized');
    }
    return redis_client;
}

module.exports = {
    create_redis_client,
    build_redis_url,
    connect_redis,
    test_redis_connection,
    close_redis_client,
    get_redis_client,
};
