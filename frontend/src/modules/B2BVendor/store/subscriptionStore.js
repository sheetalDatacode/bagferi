import { create } from 'zustand';
import api from '../../../shared/utils/api';

/**
 * Subscription Status Store
 * Centralized state management for subscription rules and limits
 * 
 * BUSINESS RULES:
 * - All plans valid for 1 year
 * - Without active subscription: No listings allowed
 * 
 * TEXTILE VENDOR PLANS:
 * - BASIC: Max 50 products, NO lot/slot
 * - SILVER: Max 100 products, NO lot/slot  
 * - DIAMOND: Unlimited products, Lot/Slot allowed
 * 
 * PROPERTY VENDOR PLANS:
 * - DEVELOPER PREMIUM: Unlimited properties, Max 50 images per property
 * - BROKER PREMIUM: Unlimited properties, Max 5 images per property
 */

export const useSubscriptionStore = create((set, get) => ({
    // State
    status: null,
    loading: false,
    error: null,
    lastFetched: null,

    // Fetch subscription status from API
    fetchStatus: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.loading) return state.status;

        // Skip refresh if data was fetched recently (5 min cache)
        const CACHE_DURATION = 5 * 60 * 1000;
        if (!force && state.lastFetched && (Date.now() - state.lastFetched) < CACHE_DURATION) {
            return state.status;
        }

        set({ loading: true, error: null });

        try {
            const [subResponse, addonResponse] = await Promise.all([
                api.get('/vendor/subscriptions/status'),
                api.get('/vendor/addons/status')
            ]);

            if (subResponse.success && subResponse.data) {
                set({
                    status: subResponse.data,
                    addons: addonResponse?.success ? addonResponse.data : [],
                    loading: false,
                    lastFetched: Date.now()
                });
                return subResponse.data;
            } else {
                throw new Error(subResponse.message || 'Failed to fetch subscription status');
            }
        } catch (error) {
            console.error('Error fetching subscription status:', error);
            set({
                loading: false,
                error: error.message || 'Failed to fetch subscription status'
            });
            return null;
        }
    },

    // Clear status (on logout)
    clearStatus: () => {
        set({ status: null, loading: false, error: null, lastFetched: null });
    },

    // Refresh status after actions (like creating a product)
    refreshStatus: async () => {
        const state = get();
        // Force refresh by clearing lastFetched
        set({ lastFetched: null });
        return state.fetchStatus(true);
    },

    // Helper getters
    hasActiveSubscription: () => {
        const state = get();
        return state.status?.hasSubscription === true;
    },

    hasShop: () => {
        const state = get();
        return state.status?.hasShop === true;
    },

    canCreateProduct: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.products;
        if (!limits?.allowed) return { allowed: false, message: 'Your subscription does not allow product listings.' };

        // Check remaining limit
        const remaining = limits.remaining;
        
        if (limits.limit !== -1 && remaining !== undefined && remaining <= 0) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'products',
                message: `Product limit reached (${limits.current}/${limits.limit}). Please buy an add-on pack or upgrade your plan.`,
                current: limits.current,
                limit: limits.limit,
                remaining: limits.remaining
            };
        }

        return {
            allowed: true,
            maxImages: limits.maxImages || state.status?.limits?.properties?.maxImages || 5,
            remaining: limits.remaining ?? 0,
            current: limits.current ?? 0,
            limit: limits.limit ?? 0
        };
    },

    canCreateLotSlot: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.lotSlot;
        if (!limits?.allowed && !limits?.hasAddon) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'lot_slot',
                message: 'Lot/Slot listings require Diamond plan or an Add-on pack.'
            };
        }

        // Check remaining limit
        const remaining = limits.remaining;
        
        if (limits.limit !== -1 && remaining !== undefined && remaining <= 0) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'lot_slot',
                message: `Lot/Slot limit reached. Please buy an add-on pack.`,
                current: limits.current,
                limit: limits.limit,
                remaining: limits.remaining
            };
        }

        return { 
            allowed: true, 
            remaining: limits.remaining ?? 0,
            current: limits.current ?? 0,
            limit: limits.limit ?? 0
        };
    },

    canCreateProperty: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.properties;
        if (!limits?.allowed) {
            return {
                allowed: false,
                message: 'Your subscription does not allow property listings.'
            };
        }

        // Check remaining limit
        const remaining = limits.remaining;
        
        if (limits.limit !== -1 && remaining !== undefined && remaining <= 0) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'property',
                message: `Property limit reached (${limits.current}/${limits.limit}). Please buy an add-on pack.`,
                current: limits.current,
                limit: limits.limit,
                remaining: limits.remaining
            };
        }

        return {
            allowed: true,
            maxImages: limits.maxImages,
            current: limits.current ?? 0,
            limit: limits.limit ?? 0,
            remaining: limits.remaining ?? 0
        };
    },

    canUploadReel: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to upload reels.' };

        const limits = state.status?.limits?.reels;
        if (!limits?.allowed) return { allowed: false, message: 'Reel uploads not allowed.' };

        // Check limits
        const remaining = limits.remaining;
        
        if (limits.limit !== -1 && remaining !== undefined && remaining <= 0) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'reels',
                message: `Reel limit reached (${limits.current}/${limits.limit}). Please buy an add-on pack.`,
                current: limits.current,
                limit: limits.limit,
                remaining: limits.remaining
            };
        }

        return {
            allowed: true,
            remaining: limits.remaining ?? 0,
            current: limits.current ?? 0,
            limit: limits.limit ?? 0
        };
    },

    canCreateJob: () => {
        const state = get();
        if (!state.status?.hasSubscription && !state.status?.limits?.jobs?.hasAddon) return { allowed: false, message: 'Please purchase a subscription plan or job add-on to post jobs.' };

        const limits = state.status?.limits?.jobs;
        if (!limits?.allowed && !limits?.hasAddon) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'jobs',
                message: 'Job posting requires an active plan or a Job Add-on pack.'
            };
        }

        // Check limits
        const remaining = limits.remaining;
        
        if (limits.limit !== -1 && remaining !== undefined && remaining <= 0) {
            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'jobs',
                message: `Job limit reached (${limits.current}/${limits.limit}). Please buy a Job Add-on.`,
                current: limits.current,
                limit: limits.limit,
                remaining: limits.remaining
            };
        }

        return {
            allowed: true,
            remaining: limits.remaining ?? 0,
            current: limits.current ?? 0,
            limit: limits.limit ?? 0
        };
    },

    // Get plan info
    getPlanInfo: () => {
        const state = get();
        return state.status?.plan || null;
    },

    getBusinessType: () => {
        const state = get();
        return state.status?.businessType || 'textile';
    },

    // Check if should show different listing sections based on business type
    isTextileVendor: () => {
        const state = get();
        const bt = (state.status?.businessType || '').toLowerCase().trim();
        // Allow anything that doesn't scream "Real Estate" to be treated as B2B/Textile
        return bt === 'textile' || (!bt.includes('developer') && !bt.includes('broker') && !bt.includes('property'));
    },

    isPropertyVendor: () => {
        const state = get();
        const bt = state.status?.businessType;
        return bt === 'developer' || bt === 'property-broker';
    }
}));

export default useSubscriptionStore;
