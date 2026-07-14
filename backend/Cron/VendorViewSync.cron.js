import cron from 'node-cron';
import redisService from '../services/redis.service.js';
import redisClient from '../config/redis.config.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Sync Vendor Views from Redis to MongoDB
 * Runs every 5 minutes to persist data and prevent data loss.
 * Prevents memory leaks by cleaning up processed keys.
 */
export const syncVendorViewsCron = cron.schedule('*/5 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🔄 Vendor view sync cron started...`);

    if (!redisClient.isReady) {
        console.warn('⚠️ Redis not ready, skipping sync');
        return;
    }

    try {
        const processedVendors = [];

        // Use scanIterator for simplest cursor handling
        // node-redis v4+ handles the cursor logic internally
        for await (const result of redisClient.scanIterator({
            MATCH: 'vendor:views:*',
            COUNT: 100
        })) {
            // Verify if result is a single key (string) or array of keys
            // The error log suggests it might be returning multiple keys in one iteration or an array
            // normalizing to array to handle both cases safely
            const keys = Array.isArray(result) ? result : [result];

            for (const key of keys) {
                try {
                    // Ensure key is a string
                    if (typeof key !== 'string') continue;

                    // Extract Vendor ID
                    const parts = key.split(':');
                    const vendorId = parts[2];

                    if (!vendorId) continue;

                    // Atomically read and reset view count
                    const viewsStr = await redisClient.getSet(key, '0');
                    const views = parseInt(viewsStr || '0');

                    if (views > 0) {
                        await Vendor.findByIdAndUpdate(vendorId, {
                            $inc: { 'metrics.views': views }
                        });
                        processedVendors.push({ id: vendorId, count: views });
                    } else {
                        // Safe cleanup of idle keys
                        await redisClient.del(key);
                    }
                } catch (err) {
                    console.error(`Error syncing key ${key}:`, err);
                }
            }
        }

        if (processedVendors.length > 0) {
            console.log(`✅ Synced views for ${processedVendors.length} vendors.`);
        }
        console.log(`[${new Date().toISOString()}] ✅ Vendor view sync cron finished`);

    } catch (error) {
        console.error('❌ Vendor View Sync Cron Failed:', error);
    }
});
