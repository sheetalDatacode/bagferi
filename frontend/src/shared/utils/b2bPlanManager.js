// B2B Subscription Plan Manager
// Manages subscription plans for B2B vendors via API

import api from './api';

// Default plans if none exist
const DEFAULT_PLANS = [
    {
        id: 'plan_12_months',
        name: 'Yearly Plan',
        duration: 12,
        price: 9999,
        features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management',
            'Custom API Integration',
            'Personal Account Manager'
        ],
        isActive: true
    }
];

// Cache for plans (keyed by 'all' or businessType slug)
let plansCache = {};
let cacheTimestamps = {};
let plansPromises = {}; // Track in-flight promises
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all B2B subscription plans from API
 * @param {Boolean} forceRefresh - Force refresh from API
 * @returns {Promise<Array>} Array of plans
 */
export const getB2BPlans = async (forceRefresh = false, options = {}) => {
    const { businessType, isAdmin = false } = options;
    const cacheKey = isAdmin ? 'admin-all' : (businessType || 'all');

    // 1. Check if we have valid cache and not forcing refresh
    if (!forceRefresh && plansCache[cacheKey] && cacheTimestamps[cacheKey] && (Date.now() - cacheTimestamps[cacheKey]) < CACHE_DURATION) {
        return plansCache[cacheKey];
    }

    // 2. Check if there's already an in-flight request for this key
    if (!forceRefresh && plansPromises[cacheKey]) {
        return plansPromises[cacheKey];
    }

    // 3. Create new request promise
    plansPromises[cacheKey] = (async () => {
        try {
            let url = isAdmin ? '/admin/b2b-subscription-plans' : '/public/b2b-subscription-plans/active';

            // For admin, if we want to include inactive/all, we use the base route
            // For public active, we already have /active in the URL

            if (businessType) {
                const separator = url.includes('?') ? '&' : '?';
                url += `${separator}businessType=${businessType}`;
            }

            if (forceRefresh) {
                const separator = url.includes('?') ? '&' : '?';
                url += `${separator}forceRefresh=true`;
            }

            const response = await api.get(url);
            if (response.success && response.data) {
                plansCache[cacheKey] = response.data;
                cacheTimestamps[cacheKey] = Date.now();
                return response.data;
            }

            // Fallback to default if API fails
            console.warn('Failed to fetch plans from API, using defaults');
            return DEFAULT_PLANS;
        } catch (error) {
            console.error('Error getting B2B plans from API:', error);
            // Return cached data if available, otherwise defaults
            return plansCache[cacheKey] || DEFAULT_PLANS;
        } finally {
            // Remove promise from in-flight list after completion
            // (Cache will be used for subsequent calls)
            setTimeout(() => {
                delete plansPromises[cacheKey];
            }, 0);
        }
    })();

    return plansPromises[cacheKey];
};

/**
 * Get active plans only (synchronous version using cache)
 * @returns {Array} Array of active plans
 */
/**
 * Get active plans only (synchronous version using cache)
 * @returns {Array} Array of active plans
 */
export const getActiveB2BPlansSync = (businessType = null) => {
    const cacheKey = businessType || 'all';
    if (plansCache[cacheKey]) {
        return plansCache[cacheKey].filter(plan => plan.isActive !== false);
    }
    // Try to find in any cache entry if not found directly
    const allCached = Object.values(plansCache).flat();
    if (allCached.length > 0) {
        return allCached.filter(plan => plan.isActive !== false);
    }
    return DEFAULT_PLANS.filter(plan => plan.isActive !== false);
};

// ... (getActiveB2BPlans remains same as it calls getB2BPlans)

/**
 * Get plan by ID (from cache or API)
 * @param {String} planId - Plan ID
 * @returns {Promise<Object|null>} Plan object or null
 */
export const getB2BPlanById = async (planId) => {
    try {
        // Try cache first (search all Cached lists)
        const allCached = Object.values(plansCache).flat();
        const plan = allCached.find(p => p._id === planId || p.id === planId);
        if (plan) return plan;

        // Fetch from API
        const response = await api.get(`/public/b2b-subscription-plans/${planId}`);
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error getting plan by ID:', error);
        // Try cache as fallback
        const allCached = Object.values(plansCache).flat();
        return allCached.find(p => p._id === planId || p.id === planId) || null;
    }
};

/**
 * Get plan by ID synchronously (from cache)
 * @param {String} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
// ... (getActiveB2BPlans was removed in previous step but needed if not included in ... )
export const getActiveB2BPlans = async (forceRefresh = false, options = {}) => {
    // Handle case where first argument is options object (legacy call style)
    if (typeof forceRefresh === 'object' && forceRefresh !== null) {
        options = forceRefresh;
        forceRefresh = options.forceRefresh || false;
    }
    const plans = await getB2BPlans(forceRefresh, options);
    return plans.filter(plan => plan.isActive !== false);
};

/**
 * Get plan by ID synchronously (from cache)
 * @param {String} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
export const getB2BPlanByIdSync = (planId) => {
    const allCached = Object.values(plansCache).flat();
    if (allCached.length > 0) {
        return allCached.find(p => p._id === planId || p.id === planId) || null;
    }
    return DEFAULT_PLANS.find(p => p._id === planId || p.id === planId) || null;
};

/**
 * Update a plan via API
 * @param {String} planId - Plan ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated plan
 */
export const updateB2BPlan = async (planId, updates) => {
    try {
        const response = await api.put(`/admin/b2b-subscription-plans/${planId}`, updates);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = {};
            cacheTimestamps = {};
            return response.data;
        }
        throw new Error(response.message || 'Failed to update plan');
    } catch (error) {
        console.error('Error updating plan:', error);
        throw error;
    }
};

/**
 * Create a new plan via API
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export const createB2BPlan = async (planData) => {
    try {
        const response = await api.post('/admin/b2b-subscription-plans', planData);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = {};
            cacheTimestamps = {};
            return response.data;
        }
        throw new Error(response.message || 'Failed to create plan');
    } catch (error) {
        console.error('Error creating plan:', error);
        throw error;
    }
};

/**
 * Delete a plan (soft delete) via API
 * @param {String} planId - Plan ID
 * @returns {Promise<Object>} Deleted plan
 */
export const deleteB2BPlan = async (planId) => {
    try {
        const response = await api.delete(`/admin/b2b-subscription-plans/${planId}`);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = {};
            cacheTimestamps = {};
            return response.data;
        }
        throw new Error(response.message || 'Failed to delete plan');
    } catch (error) {
        console.error('Error deleting plan:', error);
        throw error;
    }
};

/**
 * Initialize default plans via API
 * @returns {Promise<Array>} Array of plans
 */
export const initializeDefaultPlans = async () => {
    try {
        const response = await api.post('/admin/b2b-subscription-plans/initialize');
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = {};
            cacheTimestamps = {};
            return response.data;
        }
        throw new Error(response.message || 'Failed to initialize plans');
    } catch (error) {
        console.error('Error initializing plans:', error);
        throw error;
    }
};

/**
 * Clear plans cache (useful after updates)
 */
export const clearPlansCache = () => {
    plansCache = {};
    cacheTimestamps = {};
};
