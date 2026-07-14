import redisClient from '../config/redis.config.js';

/**
 * Redis Caching Service
 */
class RedisService {
    /**
     * Set cache value
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Time to live in seconds (default 3600 = 1 hour)
     */
    async set(key, value, ttl = 3600) {
        try {
            if (!redisClient.isReady) return false;

            const stringValue = JSON.stringify(value);
            await redisClient.set(key, stringValue, {
                EX: ttl
            });
            return true;
        } catch (error) {
            console.error(`Redis SET error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Get cache value
     * @param {string} key 
     */
    async get(key) {
        try {
            if (!redisClient.isReady) return null;

            const value = await redisClient.get(key);
            if (!value) return null;

            return JSON.parse(value);
        } catch (error) {
            console.error(`Redis GET error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Delete cache value
     * @param {string} key 
     */
    async del(key) {
        try {
            if (!redisClient.isReady || !key) return false;
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error(`Redis DEL error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Clear keys by pattern (e.g., "products:*") using SCAN
     * Replaces dangerous KEYS command which can block Redis
     * @param {string} pattern 
     */
    async clearPattern(pattern) {
        try {
            if (!redisClient.isReady || !pattern) return false;

            const keys = [];
            // Use scanIterator for safe modification
            for await (const key of redisClient.scanIterator({
                MATCH: pattern,
                COUNT: 100
            })) {
                if (key && typeof key === 'string') {
                    keys.push(key);
                }
            }

            if (keys.length > 0) {
                // Delete keys individually for maximum compatibility across Redis client versions
                for (const key of keys) {
                    if (key && typeof key === 'string') {
                        await redisClient.del(key);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error(`Redis clearPattern error (pattern: ${pattern}):`, error);
            return false;
        }
    }

    /**
     * Increment with Expiry (Atomic)
     * Helps in rate limiting to avoid race conditions
     * @param {string} key 
     * @param {number} ttl 
     */
    async incrWithExpire(key, ttl) {
        try {
            if (!redisClient.isReady) return null;

            // Using Multi/Exec transaction for atomicity
            const multi = redisClient.multi();
            multi.incr(key);
            multi.expire(key, ttl);
            const results = await multi.exec();

            return results[0]; // Return the incremented value
        } catch (error) {
            console.error(`Redis INCR+EXPIRE error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Increment a key
     * @param {string} key 
     */
    async incr(key) {
        try {
            if (!redisClient.isReady) return null;
            return await redisClient.incr(key);
        } catch (error) {
            console.error(`Redis INCR error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Decrement a key
     * @param {string} key 
     */
    async decr(key) {
        try {
            if (!redisClient.isReady) return null;
            return await redisClient.decr(key);
        } catch (error) {
            console.error(`Redis DECR error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Set expiration for a key
     * @param {string} key 
     * @param {number} ttl - Seconds
     */
    async expire(key, ttl) {
        try {
            if (!redisClient.isReady) return false;
            return await redisClient.expire(key, ttl);
        } catch (error) {
            console.error(`Redis EXPIRE error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Hash Set
     * @param {string} key 
     * @param {string} field 
     * @param {any} value 
     */
    async hSet(key, field, value) {
        try {
            if (!redisClient.isReady) return false;
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            await redisClient.hSet(key, field, stringValue);
            return true;
        } catch (error) {
            console.error(`Redis HSET error (key: ${key}, field: ${field}):`, error);
            return false;
        }
    }

    /**
     * Get TTL of a key
     * @param {string} key 
     */
    async ttl(key) {
        try {
            if (!redisClient.isReady) return -2;
            return await redisClient.ttl(key);
        } catch (error) {
            console.error(`Redis TTL error (key: ${key}):`, error);
            return -2;
        }
    }

    /**
     * Hash Get
     * @param {string} key 
     * @param {string} field 
     */
    async hGet(key, field) {
        try {
            if (!redisClient.isReady) return null;
            const value = await redisClient.hGet(key, field);
            if (!value) return null;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Redis HGET error (key: ${key}, field: ${field}):`, error);
            return null;
        }
    }

    /**
     * Cache Middleware wrapper for Express
     * @param {string} keyPrefix - Prefix for the cache key
     * @param {number} ttl - TTL in seconds
     */
    cacheMiddleware(keyPrefix, ttl = 3600) {
        return async (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            // Create a unique key based on URL and optionally user ID/vendor ID
            let key = `${keyPrefix}:${req.originalUrl || req.url}`;

            // Check for forceRefresh query parameter to bypass cache
            const forceRefresh = req.query.forceRefresh === 'true';

            // If user is authenticated, append user info to key for user-specific caching
            if (req.user) {
                const userId = req.user.id || req.user._id || req.user.userId;
                const vendorId = req.user.vendorId;
                if (userId) key += `:u:${userId}`;
                if (vendorId) key += `:v:${vendorId}`;
            }

            try {
                if (!forceRefresh) {
                    const cachedData = await this.get(key);
                    if (cachedData) {
                        res.set('X-Cache', 'HIT');
                        return res.json(cachedData);
                    }
                }

                res.set('X-Cache', forceRefresh ? 'BYPASS' : 'MISS');
                // If not in cache, intercept the response and cache it
                const originalJson = res.json;
                res.json = (data) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        this.set(key, data, ttl);
                    }
                    return originalJson.call(res, data);
                };

                next();
            } catch (error) {
                console.error('Redis middleware error:', error);
                next();
            }
        };
    }
}

export default new RedisService();
