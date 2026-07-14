import { create } from 'zustand';
import api from '../../../shared/utils/api';

export const useDashboardStore = create((set, get) => ({
    // State
    data: null,
    loading: false,
    error: null,
    lastFetched: null,

    // Fetch dashboard data
    fetchDashboardData: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.loading) return state.data;

        // Cache for 10 seconds
        const CACHE_DURATION = 10 * 1000;
        if (!force && state.lastFetched && (Date.now() - state.lastFetched) < CACHE_DURATION) {
            return state.data;
        }

        set({ loading: true, error: null });

        try {
            const response = await api.get('/vendor/dashboard');

            if (response.success && response.data) {
                set({
                    data: response.data,
                    loading: false,
                    lastFetched: Date.now()
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            set({
                loading: false,
                error: error.message || 'Failed to fetch dashboard data'
            });
            return null;
        }
    },

    // Refresh data
    refreshDashboard: () => {
        return get().fetchDashboardData(true);
    },

    // Clear state
    clearDashboard: () => {
        set({ data: null, loading: false, error: null, lastFetched: null });
    }
}));

export default useDashboardStore;
