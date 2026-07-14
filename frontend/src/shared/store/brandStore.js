import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useBrandStore = create(
  persist(
    (set, get) => ({
      brands: [],
      isLoading: false,
      lastFetched: null,

      // Fetch brands from API
      fetchBrands: async (forceRefresh = false) => {
        const state = get();
        // Cache for 30 seconds (reduced from 5 minutes for faster updates)
        const CACHE_DURATION = 30 * 1000;
        const now = Date.now();
        
        if (!forceRefresh && state.brands.length > 0 && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
          return state.brands;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/brands?limit=100&sortBy=name&sortOrder=asc');
          
          if (response.success && response.data?.brands) {
            // Transform API response to match expected format
            const transformedBrands = response.data.brands.map((brand) => ({
              id: brand._id || brand.id,
              name: brand.name,
              logo: brand.logo || '',
              description: brand.description || '',
              website: brand.website || '',
              isActive: brand.isActive !== undefined ? brand.isActive : true,
            }));

            set({ 
              brands: transformedBrands, 
              isLoading: false,
              lastFetched: now,
            });
            return transformedBrands;
          } else {
            throw new Error(response.message || 'Failed to fetch brands');
          }
        } catch (error) {
          // Suppress network errors (backend might not be running)
          if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
            // Silently handle - backend not available
            if (import.meta.env.DEV) {
              console.warn('Backend not available. Brands will be empty.');
            }
          } else if (import.meta.env.DEV) {
            console.error('Error fetching brands:', error);
          }
          set({ isLoading: false });
          // Return empty array on error, don't throw
          return [];
        }
      },

      // Initialize brands (fetch from API)
      initialize: async () => {
        const state = get();
        if (state.brands.length === 0) {
          await state.fetchBrands();
        }
        return get().brands;
      },

      // Get all brands (synchronous - returns cached brands)
      getBrands: () => {
        return get().brands;
      },

      // Get brand by ID
      getBrandById: (id) => {
        const brands = get().brands;
        // Try to match by _id (MongoDB) or id (transformed)
        return brands.find((brand) => 
          brand.id === id || 
          brand.id === String(id) || 
          brand._id === id ||
          brand._id === String(id)
        );
      },

      // Refresh brands from API (force refresh, bypass cache)
      refreshBrands: async () => {
        set({ lastFetched: null });
        return await get().fetchBrands(true);
      },

      // Invalidate cache (for immediate refresh on next fetch)
      invalidateCache: () => {
        set({ lastFetched: null });
      },
    }),
    {
      name: 'brand-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

