import redisService from '../services/redis.service.js';

/**
 * Generic Rate Limiter Middleware using Redis
 * @param {string} prefix - Key prefix (e.g., 'login', 'otp', 'forgot-password')
 * @param {number} limit - Max requests
 * @param {number} windowInSeconds - Time window
 */
export const rateLimiter = (prefix, limit = 10, windowInSeconds = 600) => {
    return async (req, res, next) => {
        try {
            // Get IP address (handle proxy/load balancer)
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const key = `rate:limit:${prefix}:${ip}`;

            // Atomic Increment or Increment+Expire
            // If key doesn't exist (current=1), we set expiry. If it exists, we just increment.
            // However, Redis INCR happens first. To be safe, we can use our atomic wrapper for the first hit
            // or just use TTL check.

            // Optimization: Get TTL. If -1 or -2 (expired/no expiry), set new cycle.
            // But to keep it simple and safe:

            let current = await redisService.incr(key);

            if (current === 1) {
                // First request, set expiry safely
                await redisService.expire(key, windowInSeconds);
            } else {
                // Ensure TTL is present (in case of race condition or restart)
                const ttl = await redisService.ttl(key);
                if (ttl === -1) {
                    await redisService.expire(key, windowInSeconds);
                }
            }

            if (current > limit) {
                return res.status(429).json({
                    success: false,
                    message: `Too many requests for ${prefix}. Please try again later.`,
                    retryAfter: windowInSeconds
                });
            }

            next();
        } catch (error) {
            console.error('Rate Limiter Error:', error);
            // On Redis error, allow the request to proceed (Redis is optional)
            next();
        }
    };
};
