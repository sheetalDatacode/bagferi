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

    // Fetch subscription status from API (mocked since subscriptions are removed)
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
            // Since subscriptions are removed, we only check if the user has a shop
            const shopResponse = await api.get('/b2b-vendor/shop-units');
            
            const hasShop = shopResponse.success && shopResponse.data !== null;

            const mockedStatus = {
                hasSubscription: true,
                hasShop: hasShop,
                plan: {
                    name: 'Unlimited',
                },
                limits: {
                    products: { allowed: true, limit: -1, remaining: 9999, current: 0 },
                    lotSlot: { allowed: true, limit: -1, remaining: 9999, current: 0 },
                    properties: { allowed: true, limit: -1, remaining: 9999, current: 0, maxImages: 50 },
                    reels: { allowed: true, limit: -1, remaining: 9999, current: 0 },
                    jobs: { allowed: true, limit: -1, remaining: 9999, current: 0 }
                }
            };

            set({
                status: mockedStatus,
                addons: [],
                loading: false,
                lastFetched: Date.now()
            });
            return mockedStatus;
        } catch (error) {
            console.error('Error fetching shop status:', error);
            set({
                loading: false,
                error: error.message || 'Failed to fetch status'
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
        return {
            allowed: true,
            remaining: -1,
            current: 0,
            limit: -1
        };
    },

    canCreateJob: () => {
        return {
            allowed: true,
            remaining: -1,
            current: 0,
            limit: -1
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
