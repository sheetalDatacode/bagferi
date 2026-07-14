// B2B Addon Plan Manager
// Manages addon plans for B2B vendors via API

import api from './api';

let addonCache = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get all B2B addon plans (Admin)
 */
export const getAddonPlans = async (forceRefresh = false) => {
    if (!forceRefresh && addonCache && (Date.now() - lastFetch < CACHE_DURATION)) {
        return addonCache;
    }

    try {
        const response = await api.get('/admin/b2b-addon-plans');
        if (response.success) {
            addonCache = response.data;
            lastFetch = Date.now();
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching addon plans:', error);
        return addonCache || [];
    }
};

/**
 * Create a new addon plan
 */
export const createAddonPlan = async (planData) => {
    try {
        const response = await api.post('/admin/b2b-addon-plans', planData);
        if (response.success) {
            addonCache = null; // Clear cache
            return response.data;
        }
        throw new Error(response.message || 'Failed to create addon plan');
    } catch (error) {
        console.error('Error creating addon plan:', error);
        throw error;
    }
};

/**
 * Update an addon plan
 */
export const updateAddonPlan = async (id, updates) => {
    try {
        const response = await api.put(`/admin/b2b-addon-plans/${id}`, updates);
        if (response.success) {
            addonCache = null; // Clear cache
            return response.data;
        }
        throw new Error(response.message || 'Failed to update addon plan');
    } catch (error) {
        console.error('Error updating addon plan:', error);
        throw error;
    }
};

/**
 * Delete an addon plan
 */
export const deleteAddonPlan = async (id) => {
    try {
        const response = await api.delete(`/admin/b2b-addon-plans/${id}`);
        if (response.success) {
            addonCache = null; // Clear cache
            return response.data;
        }
        throw new Error(response.message || 'Failed to delete addon plan');
    } catch (error) {
        console.error('Error deleting addon plan:', error);
        throw error;
    }
};
