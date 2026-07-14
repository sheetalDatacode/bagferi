import { Navigate, useLocation } from 'react-router-dom';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { useEffect, useState } from 'react';
import api from '../../../shared/utils/api';

const B2BVendorProtectedRoute = ({ children }) => {
    const { isAuthenticated, logout, vendor } = useB2BVendorAuthStore();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

    // Wait for Zustand persist to hydrate on mount
    useEffect(() => {
        // Small delay to ensure Zustand persist has hydrated from localStorage
        const timer = setTimeout(() => {
            setIsChecking(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Check subscription expiry on mount and periodically
    useEffect(() => {
        if (!isChecking && isAuthenticated && vendor && vendor.vendorType === 'b2b') {
            const checkSubscription = async () => {
                try {

                    const response = await api.get('/vendor/subscriptions/current');
                    if (response.success && response.data) {
                        const subscription = response.data;
                        // Check if subscription is expired
                        if (subscription && subscription.endDate) {
                            const now = new Date();
                            const endDate = new Date(subscription.endDate);
                            if (endDate < now) {
                                console.log('[B2BVendorProtectedRoute] Subscription expired, warning only');
                                // In simplified registration, we might want to allow login but limit features
                                // For now, we'll allow access but backend will restrict product additions
                            }

                            if (subscription.status !== 'active') {
                                console.log('[B2BVendorProtectedRoute] Subscription inactive:', subscription.status);
                            }
                        } else if (subscription === null) {
                            // No subscription found for B2B vendor - allow access in simplified registration flow
                            console.log('[B2BVendorProtectedRoute] No subscription found for B2B vendor, allowing access (simplified registration)');
                        }
                    }
                } catch (error) {
                    console.error('[B2BVendorProtectedRoute] Error checking subscription:', error);
                    // Don't block access on error, backend will handle it
                }
            };

            checkSubscription();
            // Check every 5 minutes
            const interval = setInterval(checkSubscription, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [isChecking, isAuthenticated, vendor, logout]);

    // Get token from localStorage (source of truth)
    const token = localStorage.getItem('b2b-vendor-token');

    // If still checking, don't redirect yet
    if (isChecking) {
        return null; // or a waiting for hydration
    }

    // Check authentication - token is required
    if (!token) {
        // If store says authenticated but no token, logout to sync state
        if (isAuthenticated) {
            console.warn('[B2BVendorProtectedRoute] State mismatch: isAuthenticated but no token, logging out');
            logout();
        }
        return <Navigate to="/b2b-vendor/login" state={{ from: location }} replace />;
    }

    // If token exists but store says not authenticated, this might be a hydration issue
    // Allow access if token exists (it will be validated by backend)
    if (!isAuthenticated && token) {
        console.warn('[B2BVendorProtectedRoute] Token exists but store not authenticated - allowing access, backend will validate');
    }

    // Block access if vendor is inactive or rejected
    if (vendor && (vendor.isActive === false || vendor.status === 'rejected')) {
        console.warn(`[B2BVendorProtectedRoute] Blocking access - isActive: ${vendor.isActive}, status: ${vendor.status}`);
        return <Navigate to="/b2b-vendor/login" state={{ from: location, reason: vendor.isActive === false ? 'inactive' : 'rejected' }} replace />;
    }

    return children;
};

export default B2BVendorProtectedRoute;
