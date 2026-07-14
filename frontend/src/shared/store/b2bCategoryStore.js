import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// Helper to transform MongoDB _id to id for frontend compatibility
const transformCategory = (category) => {
    if (!category) return null;

    return {
        ...category,
        id: category._id?.toString() || category.id?.toString() || category.id,
    };
};

const transformCategories = (categories) => {
    return categories.map(transformCategory);
};

const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache - provides near real-time updates after admin changes

export const useB2BCategoryStore = create(
    persist(
        (set, get) => ({
            categories: [],
            isLoading: false,
            lastFetched: null,

            // Initialize categories - fetch from API
            initialize: async (forceRefresh = false) => {
                const currentState = get();

                // Prevent duplicate fetch if already loading
                if (currentState.isLoading) return;

                const isCacheStale = !currentState.lastFetched ||
                    (Date.now() - currentState.lastFetched) > CACHE_TTL_MS;

                // If we have data and it's not stale/forced, we can skip fetching
                if (!forceRefresh && !isCacheStale && currentState.categories.length > 0) {
                    return;
                }

                // If we don't have any categories yet, show loading state
                if (currentState.categories.length === 0) {
                    set({ isLoading: true });
                }

                try {
                    // Fetch categories normally. Redis will handle the caching on the server side.
                    // When an admin adds a category, the server will clear this cache automatically.
                    const response = await api.get('/public/b2b-categories');
                    const list = response?.data || [];
                    const categories = transformCategories(list);

                    set({
                        categories,
                        isLoading: false,
                        lastFetched: Date.now()
                    });
                } catch (error) {
                    console.error('Failed to fetch B2B categories:', error);
                    set({ isLoading: false });
                }
            },

            // Get all categories
            getCategories: () => {
                const state = get();
                if (state.categories.length === 0) {
                    state.initialize();
                }
                return get().categories;
            },

            // Get category by ID
            getCategoryById: (id) => {
                const categories = get().categories;
                return categories.find((cat) => {
                    const catId = cat.id || cat._id;
                    const searchId = id?.toString() || id;
                    return catId?.toString() === searchId;
                });
            },
        }),
        {
            name: 'b2b-category-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
