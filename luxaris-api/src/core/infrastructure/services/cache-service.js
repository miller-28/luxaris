/**
 * Simple cache service wrapper for Memcached client
 * Provides a consistent interface for caching operations
 */
class CacheService {
    
    constructor(cache_client) {
        this.cache_client = cache_client;
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache (will be JSON stringified)
     * @param {number} ttl - Time to live in seconds
     */
    async set(key, value, ttl = 3600) {
        return new Promise((resolve) => {
            try {
                const serialized = JSON.stringify(value);
                this.cache_client.set(key, serialized, ttl, (error) => {
                    if (error) {
                        console.error('Cache set error:', error);
                        resolve(false); // Don't reject - cache is not critical
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error('Cache set error:', error);
                resolve(false);
            }
        });
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found
     */
    async get(key) {
        return new Promise((resolve) => {
            try {
                this.cache_client.get(key, (error, data) => {
                    if (error || !data) {
                        if (error) {
                            console.error('Cache get error:', error);
                        }
                        resolve(null);
                    } else {
                        try {
                            resolve(JSON.parse(data));
                        } catch (parse_error) {
                            console.error('Cache parse error:', parse_error);
                            resolve(null);
                        }
                    }
                });
            } catch (error) {
                console.error('Cache get error:', error);
                resolve(null);
            }
        });
    }

    /**
     * Delete a value from cache
     * @param {string} key - Cache key
     * @returns {boolean} True if deleted
     */
    async delete(key) {
        return new Promise((resolve) => {
            try {
                this.cache_client.del(key, (error) => {
                    if (error) {
                        console.error('Cache delete error:', error);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error('Cache delete error:', error);
                resolve(false);
            }
        });
    }

    /**
     * Check if a key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if exists
     */
    async exists(key) {
        const value = await this.get(key);
        return value !== null;
    }

    /**
     * Clear all cache entries (use with caution)
     */
    async clear() {
        return new Promise((resolve) => {
            try {
                this.cache_client.flush((error) => {
                    if (error) {
                        console.error('Cache clear error:', error);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error('Cache clear error:', error);
                resolve(false);
            }
        });
    }
}

module.exports = CacheService;
