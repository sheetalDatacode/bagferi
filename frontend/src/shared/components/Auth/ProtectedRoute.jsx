import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if screen is desktop (≥1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Initial check
    checkDesktop();

    // Listen for resize events
    window.addEventListener('resize', checkDesktop);

    return () => {
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  // Wait for hydration before making any redirect decisions
  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    const isAppRoute = location.pathname.startsWith('/app');
    const isB2BRoute = location.pathname.startsWith('/b2b');

    if (isAppRoute && isDesktop) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isAppRoute) {
      return <Navigate to="/app/login" state={{ from: location }} replace />;
    }

    if (isB2BRoute) {
      return <Navigate to="/b2b/login" state={{ from: location }} replace />;
    }

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

