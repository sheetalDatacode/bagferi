
import api from './api';

// Cache promise to deduplicate in-flight requests and subsequent calls
let businessTypesPromise = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (business types rarely change)

/**
 * Get business types using cache
 * @param {boolean} forceRefresh - If true, ignores cache and fetches fresh data
 * @returns {Promise<Array>} List of business types
 */
export const getBusinessTypes = async (forceRefresh = false) => {
    // If we have a valid cache and not forcing refresh, return it
    if (!forceRefresh && businessTypesPromise) {
        // If we have a promise but no timestamp yet, it's an in-flight request - return it
        if (!cacheTimestamp) return businessTypesPromise;

        // If we have both, check if it's expired
        if ((Date.now() - cacheTimestamp) < CACHE_DURATION) {
            return businessTypesPromise;
        }
    }

    // Create new promise
    businessTypesPromise = api.get('/business-types')
        .then(response => {
            if (response.success) {
                cacheTimestamp = Date.now();
                return response.data || [];
            }
            throw new Error(response.message || 'Failed to fetch business types');
        })
        .catch(error => {
            console.error('Error fetching business types:', error);
            // Clear cache on error so next attempt tries again
            businessTypesPromise = null;
            cacheTimestamp = null;
            return []; // Return empty array on error to prevent app crash
        });

    return businessTypesPromise;
};

/**
 * Clear business types cache
 */
export const clearBusinessTypesCache = () => {
    businessTypesPromise = null;
    cacheTimestamp = null;
};
