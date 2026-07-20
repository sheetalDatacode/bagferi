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
            // Subscription checks have been removed to bypass subscription requirements.
            // No API call is made to prevent 404 errors.
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
