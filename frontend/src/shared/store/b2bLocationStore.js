import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes - auto-refresh after this

export const useB2BLocationStore = create(
    persist(
        (set, get) => ({
            states: [],
            areas: [],
            markets: [],
            isLoading: false,
            lastFetched: null,
            lastOptions: null, // Track options used for last fetch

            initialize: async (forceRefresh = false, options = {}) => {
                const currentState = get();

                if (currentState.isLoading) return;

                // If legacy data shape (areas/markets as plain strings without city info), force a refresh
                const hasLegacyAreas = Array.isArray(currentState.areas) &&
                    currentState.areas.some(a => typeof a === 'string' || (a && typeof a === 'object' && !('city' in a)));
                const hasLegacyMarkets = Array.isArray(currentState.markets) &&
                    currentState.markets.some(m => typeof m === 'string' || (m && typeof m === 'object' && !('city' in m)));

                // If states have legacy/invalid format (cities as objects or missing), force refresh
                const hasLegacyStates = Array.isArray(currentState.states) && currentState.states.length > 0 &&
                    currentState.states.some(s => {
                        const cities = s?.cities;
                        if (!Array.isArray(cities)) return true;
                        return cities.some(c => typeof c !== 'string');
                    });

                if (hasLegacyAreas || hasLegacyMarkets || hasLegacyStates) {
                    forceRefresh = true;
                }

                // Check if options have changed
                const optionsChanged = JSON.stringify(options) !== JSON.stringify(currentState.lastOptions);

                // Check if cache is stale (older than 15 minutes)
                const isCacheStale = !currentState.lastFetched ||
                    (Date.now() - currentState.lastFetched) > CACHE_TTL_MS;

                // Skip fetch ONLY if: 
                // 1. NOT forceRefresh 
                // 2. Options haven't changed
                // 3. Cache is NOT stale
                // 4. Data exists
                if (!forceRefresh && !optionsChanged && !isCacheStale && currentState.states.length > 0) return;

                set({ isLoading: true });

                try {
                    const params = {};
                    if (options.businessTypeFilter && options.businessTypes) {
                        params.businessTypeFilter = options.businessTypeFilter;
                        params.businessTypes = Array.isArray(options.businessTypes)
                            ? options.businessTypes.join(',')
                            : options.businessTypes;
                    }

                    const response = await api.get('/public/b2b-locations', { params });
                    if (response.success && response.data) {
                        const states = (response.data.states || []).map(state => ({
                            ...state,
                            name: (state.name || '').trim()
                        }));
                        const areas = response.data.areas || [];
                        const markets = response.data.markets || [];
                        set({
                            states,
                            areas,
                            markets,
                            isLoading: false,
                            lastFetched: Date.now(),
                            lastOptions: options
                        });
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error) {
                    console.error('Failed to fetch B2B locations:', error);
                    set({ isLoading: false });
                }
            },

            getStates: () => get().states,
        }),
        {
            name: 'b2b-location-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
