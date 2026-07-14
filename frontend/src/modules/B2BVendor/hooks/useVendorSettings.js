import { useState, useEffect } from 'react';
import api from '../../../shared/utils/api';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { getBusinessTypes } from '../../../shared/utils/businessTypeCache';

// In-memory cache to prevent multiple redundant API calls across components
let settingsCache = {}; // Slug -> Data
let settingsPromises = {}; // Slug -> Promise

// localStorage keys
const LS_KEY_PREFIX = 'vendor_settings_';
const LS_TIMESTAMP_PREFIX = 'vendor_settings_ts_';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Try to get settings from localStorage for instant load on page refresh.
 * Falls back to null if nothing cached or cache is stale.
 */
const getFromLocalStorage = (slug) => {
    try {
        const ts = localStorage.getItem(LS_TIMESTAMP_PREFIX + slug);
        if (!ts || (Date.now() - Number(ts)) > CACHE_MAX_AGE) {
            return null; // Cache expired or missing
        }
        const raw = localStorage.getItem(LS_KEY_PREFIX + slug);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Save settings to localStorage for instant load on next page refresh.
 */
const saveToLocalStorage = (slug, data) => {
    try {
        localStorage.setItem(LS_KEY_PREFIX + slug, JSON.stringify(data));
        localStorage.setItem(LS_TIMESTAMP_PREFIX + slug, Date.now().toString());
    } catch {
        // Silently fail (storage full, etc.)
    }
};

export const useVendorSettings = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // On mount: immediately try to restore from localStorage (zero flicker)
    useEffect(() => {
        if (!vendor) return;

        const tryRestoreFromStorage = async () => {
            try {
                const businessTypes = await getBusinessTypes();
                const vendorType = businessTypes.find(t =>
                    t.name === vendor.businessType ||
                    t.slug === vendor.businessType ||
                    t._id === vendor.businessTypeRef
                );
                if (!vendorType) return;
                const slug = vendorType.slug;

                // Instantly restore from localStorage if available
                const cached = getFromLocalStorage(slug);
                if (cached) {
                    // Set as initial value for instant display (no flicker)
                    setSettings(cached);
                    setLoading(false);
                    // Do NOT set settingsCache here — let the API fetch overwrite it
                }
            } catch {
                // Silently fail, API fetch will handle it
            }
        };
        tryRestoreFromStorage();
    }, [vendor]);

    useEffect(() => {
        if (!vendor) return;

        const fetchSettings = async () => {
            try {
                // Get the slug first
                const businessTypes = await getBusinessTypes();
                const vendorType = businessTypes.find(t =>
                    t.name === vendor.businessType ||
                    t.slug === vendor.businessType ||
                    t._id === vendor.businessTypeRef
                );

                if (!vendorType) {
                    setLoading(false);
                    return;
                }

                const slug = vendorType.slug;

                // Check if a request is already in flight (dedup concurrent calls)
                if (settingsPromises[slug]) {
                    const data = await settingsPromises[slug];
                    setSettings(data);
                    setLoading(false);
                    return;
                }

                // Always fetch fresh data from API
                settingsPromises[slug] = api.get(`/vendor/business-settings/${slug}`)
                    .then(response => {
                        if (response.success) {
                            settingsCache[slug] = response.data;
                            // Persist to localStorage for instant load on next page refresh
                            saveToLocalStorage(slug, response.data);
                            return response.data;
                        }
                        throw new Error(response.message || 'Failed to fetch settings');
                    })
                    .catch(err => {
                        // Clear promise on error to allow retry
                        delete settingsPromises[slug];
                        throw err;
                    });

                const data = await settingsPromises[slug];
                settingsCache[slug] = data;
                setSettings(data);

                // Clear promise after completion so next mount gets fresh data
                delete settingsPromises[slug];
            } catch (err) {
                console.error('Error fetching vendor business settings:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [vendor]);

    return { settings, loading, error };
};
