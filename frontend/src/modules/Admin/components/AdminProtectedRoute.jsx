import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminStore';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, initialize, isLoading } = useAdminAuthStore();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Initialize auth state on mount - wait for Zustand persist to hydrate first
    const initAuth = async () => {
      // Wait one render cycle to allow Zustand persist to hydrate
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check current auth state after hydration
      const currentAuth = useAdminAuthStore.getState();
      const token = localStorage.getItem('admin-token');

      // If we have a token but Zustand says not authenticated, validate with backend
      if (token && !currentAuth.isAuthenticated) {
        try {
          const result = await initialize();
          // If initialization returns false, token is invalid (already cleared by initialize)
          if (result === false) {
            // Token was invalid, already cleared
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // If initialization fails, clear invalid token
          localStorage.removeItem('admin-token');
        }
      } else if (currentAuth.isAuthenticated && !token) {
        // Inconsistent state: Authenticated but no token (likely cleared by interceptor)
        // Force logout to prevent redirect loops
        useAdminAuthStore.getState().logout();
        setHasCheckedAuth(true);
        setIsInitializing(false);
        return;
      }

      setHasCheckedAuth(true);
      setIsInitializing(false);
    };

    initAuth();
  }, [initialize]); // Include initialize in dependencies

  // Show loading state while initializing or checking auth
  if (isInitializing || !hasCheckedAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Redirect to admin login page with return URL
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;

