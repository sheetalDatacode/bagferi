import { Navigate, useLocation } from 'react-router-dom';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { useEffect, useState } from 'react';

const B2BVendorProtectedRoute = ({ children }) => {
    const { isAuthenticated, logout, vendor } = useB2BVendorAuthStore();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    // Flag: set to true when we detect a stale-auth state that needs cleanup
    const [needsLogout, setNeedsLogout] = useState(false);

    // Wait for Zustand persist to hydrate on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsChecking(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Perform logout AFTER render to avoid setState-during-render warning
    useEffect(() => {
        if (needsLogout) {
            logout();
        }
    }, [needsLogout, logout]);

    // Get token from localStorage (source of truth)
    const token = localStorage.getItem('b2b-vendor-token');

    // If still checking (hydrating), show nothing yet
    if (isChecking) {
        return null;
    }

    // No token → must login
    if (!token) {
        // State mismatch: store thinks authenticated but no token → schedule logout
        if (isAuthenticated && !needsLogout) {
            console.warn('[B2BVendorProtectedRoute] State mismatch: isAuthenticated but no token, scheduling logout');
            setNeedsLogout(true);
            return null; // render nothing while logout effect fires
        }
        return <Navigate to="/b2b-vendor/login" state={{ from: location }} replace />;
    }

    // Token exists but store not authenticated — hydration lag, backend will validate
    if (!isAuthenticated && token) {
        console.warn('[B2BVendorProtectedRoute] Token exists but store not authenticated - allowing access, backend will validate');
    }

    // Block access only if vendor status is explicitly rejected
    if (vendor && vendor.status === 'rejected') {
        console.warn(`[B2BVendorProtectedRoute] Blocking access - status: rejected`);
        return <Navigate to="/b2b-vendor/login" state={{ from: location, reason: 'rejected' }} replace />;
    }

    return children;
};

export default B2BVendorProtectedRoute;
