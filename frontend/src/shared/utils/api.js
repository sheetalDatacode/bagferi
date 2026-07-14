import axios from 'axios';
import toast from '../../shared/utils/toast';
import { API_BASE_URL } from './constants';
import { backendStatus } from './backendStatus';

// Log API base URL for debugging (only in development or if URL seems wrong)
if (typeof window !== 'undefined') {
  const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  const isProduction = window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('dealingindia.com') ||
    window.location.hostname.includes('dealingindia.in');

  if (isProduction && isLocalhost) {
    console.error('❌ CRITICAL: API_BASE_URL is localhost in production!');
    console.error('Current API_BASE_URL:', API_BASE_URL);
    console.error('Please set VITE_API_BASE_URL in Vercel environment variables.');
  }
}

// Create axios instance with timeout
// Increased timeout for production (email sending can take up to 60s)
const isProduction = typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('dealingindia.com') ||
    window.location.hostname.includes('dealingindia.in'));

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // Increased to 300s (5 min) for large video/image uploads
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // If FormData, let axios set Content-Type automatically (multipart/form-data)
    if (config.data instanceof FormData) {
      // Remove Content-Type header to let browser set it with boundary
      delete config.headers['Content-Type'];
    }

    // Determine which token to use based on request URL and context
    let token = null;
    let url = config.url || '';

    // Normalize URL for checking
    if (url.startsWith('http')) {
      if (url.startsWith(API_BASE_URL)) {
        url = url.substring(API_BASE_URL.length);
      }
    }
    if (url && !url.startsWith('/')) {
      url = '/' + url;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isB2BRoute = currentPath.includes('/b2b-vendor') || url.includes('/b2b-vendor/');
    const isAdminRoute = currentPath.includes('/admin') || url.includes('/admin/');

    if (isAdminRoute) {
      token = localStorage.getItem('admin-token');
    } else if (isB2BRoute) {
      // Prioritize b2b-vendor-token for the vendor dashboard
      token = localStorage.getItem('b2b-vendor-token');
      if (!token) {
        try {
          const stored = localStorage.getItem('b2b-vendor-auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            token = parsed?.state?.token;
          }
        } catch (e) { }
      }
      if (!token) {
        token = localStorage.getItem('vendor-token') || localStorage.getItem('token');
      }
    } else {
      // On the Buyer side or public pages, ALWAYS prioritize the buyer token
      // This ensures track-click and other shared APIs identify the visitor correctly
      token = localStorage.getItem('token');

      // Fallback: if token key missing but Zustand auth store still has token
      if (!token) {
        try {
          const storedAuth = localStorage.getItem('auth-storage');
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            token = parsedAuth?.state?.token || null;
          }
        } catch (e) { }
      }

      // Final fallback for shared endpoints like track-click if calling from a non-vendor path
      if (!token && (url.includes('/vendor/') || url.includes('/shared/'))) {
        token = localStorage.getItem('vendor-token') || localStorage.getItem('b2b-vendor-token');
      }
    }



    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }



    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Mark backend as up on successful response
    backendStatus.markBackendUp();
    return response.data;
  },
  (error) => {
    const isSilent = error.config?.silent === true;

    // Handle timeout and network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      // Check if this is a connection refused error (backend not running)
      const isConnectionRefused = error.code === 'ERR_NETWORK' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch');

      // Mark backend as down
      const isNewlyDown = backendStatus.markBackendDown();

      // Don't show toast for login/register pages - let components handle it
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') ||
        currentPath.includes('/register') ||
        currentPath.includes('/forgot-password') ||
        currentPath.includes('/reset-password');

      // Show notification only if:
      // 1. Not silent
      // 2. Not on auth page
      // 3. Backend is newly down OR notification should be shown
      // 4. This prevents multiple toasts for simultaneous requests
      if (!isSilent && !isAuthPage && (isNewlyDown || backendStatus.shouldShowErrorNotification())) {
        const message = isConnectionRefused
          ? 'Backend server is not running. Please start the server and refresh the page.'
          : error.code === 'ECONNABORTED'
            ? 'Request timeout. Please check your internet connection and try again.'
            : 'Network error. Please check your internet connection and try again.';

        toast.error(message, {
          id: 'backend-down-error',
          duration: 6000, // Show for 6 seconds
        });
      }

      // Create a proper error object
      const networkError = new Error(
        isConnectionRefused
          ? 'Backend server is not running'
          : error.code === 'ECONNABORTED'
            ? 'Request timeout'
            : 'Network error'
      );
      networkError.isNetworkError = true;
      networkError.isConnectionRefused = isConnectionRefused;
      return Promise.reject(networkError);
    }

    // Extract error message - prioritize backend message
    let message = error.response?.data?.message;

    // If no backend message, handle common status codes
    if (!message) {
      if (error.response?.status === 413) {
        message = 'The files you are uploading are too large. Please reduce the size of your images and try again.';
      } else if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.response?.status === 400) {
        message = 'Invalid request. Please check your input.';
      } else if (error.response?.status === 401) {
        message = 'Invalid credentials. Please check your email/phone and password.';
      } else if (error.response?.status === 403) {
        message = error.response?.data?.message || 'Access denied.';
      } else if (error.response?.status === 404) {
        message = 'Resource not found.';
      } else {
        // Clean up axios error messages
        const axiosMessage = error.message || '';
        if (axiosMessage.includes('Request failed with status code')) {
          // Don't show generic axios error messages
          message = 'Something went wrong. Please try again.';
        } else {
          message = axiosMessage || 'Something went wrong';
        }
      }
    }

    // Update error message if we have a better one from backend
    // Do this early so all logic below uses the updated message
    if (message && error.message !== message) {
      try {
        // Try to update the message property (might be read-only in some cases)
        Object.defineProperty(error, 'message', {
          value: message,
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Fallback to simple assignment
        error.message = message;
      }
    }

    // Handle 401 (Unauthorized) - clear appropriate token and redirect
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const currentPath = window.location.pathname;

      const isAdminRoute = currentPath.startsWith('/admin') || url.startsWith('/admin/') || url.includes('/admin/');
      const isB2BRoute = currentPath.startsWith('/b2b-vendor') || url.startsWith('/b2b-vendor/');

      // 401 handling: Redirect logic
      // Prevent immediate redirects and token clearing right after login (within 2 seconds)
      const loginTimestamp = sessionStorage.getItem('b2b-vendor-login-timestamp');
      const timeSinceLogin = loginTimestamp ? Date.now() - parseInt(loginTimestamp) : Infinity;
      const isRecentLogin = timeSinceLogin < 2000; // 2 seconds

      if (isRecentLogin) {
        console.warn('[API Interceptor] Suppressing 401 action due to recent login (within 2s)');
        return Promise.reject(error);
      }

      // Determine which token to clear based on the REQUEST URL, not just current path
      const requestUrl = (error.config?.url || '').toLowerCase();
      const isVendorApi = requestUrl.includes('/vendor/') || requestUrl.includes('/b2b-vendor/') || requestUrl.includes('/subscriptions/');
      const isAdminApi = requestUrl.includes('/admin/');

      console.warn(`[API Interceptor] 401 Error on: ${requestUrl} - isVendorApi: ${isVendorApi}, isAdminApi: ${isAdminApi}`);

      // Determine which token was actually used in the failing request
      const authHeader = error.config?.headers?.Authorization || '';
      const sentToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      let shouldRedirect = false;
      let redirectPath = '';

      if (isAdminApi) {
        const storedAdminToken = localStorage.getItem('admin-token');
        // Only clear if the rejected token is the same as our current one
        if (sentToken && storedAdminToken === sentToken) {
          console.log('[API Interceptor] Clearing admin token');
          localStorage.removeItem('admin-token');
          if (currentPath.startsWith('/admin') && !currentPath.includes('/login')) {
            shouldRedirect = true;
            redirectPath = '/admin/login';
          }
        }
      } else if (isVendorApi) {
        const storedB2BToken = localStorage.getItem('b2b-vendor-token');
        const storedVendorToken = localStorage.getItem('vendor-token');

        let cleared = false;
        if (sentToken && (storedB2BToken === sentToken || storedVendorToken === sentToken)) {
          console.log('[API Interceptor] Clearing vendor tokens due to matching 401');
          localStorage.removeItem('b2b-vendor-token');
          localStorage.removeItem('vendor-token');
          cleared = true;
        }

        if (cleared && (currentPath.startsWith('/b2b-vendor') || currentPath.startsWith('/vendor')) && !currentPath.includes('/login')) {
          shouldRedirect = true;
          redirectPath = currentPath.startsWith('/b2b-vendor') ? '/b2b-vendor/login' : '/vendor/login';
        }
      } else {
        const storedUserToken = localStorage.getItem('token');
        if (sentToken && storedUserToken === sentToken) {
          console.log(
            "[API Interceptor] Clearing buyer token and auth-storage due to 401",
          );
          localStorage.setItem("token_prev", storedUserToken);
          localStorage.removeItem("token");
          // Also clear persisted auth store so we don't keep reusing an invalid token
          localStorage.removeItem("auth-storage");
          if (
            !currentPath.startsWith("/vendor") &&
            !currentPath.startsWith("/b2b-vendor") &&
            !currentPath.startsWith("/admin") &&
            !currentPath.includes("/login")
          ) {
            shouldRedirect = true;
            redirectPath = "/b2b/login";
          }
        }
      }

      // Suppress toast for certain expected 401 scenarios
      const isBackgroundOperation =
        url.includes('/cart') ||
        url.includes('/wishlist') ||
        url.includes('/auth/user/logout') ||
        url.includes('/auth/admin/logout') ||
        url.includes('/auth/vendor/logout') ||
        url.includes('/auth/user/me') ||
        url.includes('/auth/admin/me') ||
        url.includes('/auth/vendor/me');

      const isDashboardOperation = url.includes('/dashboard-summary') || url.includes('/analytics');

      if (!isBackgroundOperation && !isDashboardOperation && !currentPath.includes('/login') && !isSilent) {
        if (message.includes('expired') || message.includes('Token has expired')) {
          toast.error('Your session has expired. Please login again.', { id: 'auth-error' });
        } else if (message.includes('Authentication required')) {
          toast.error('Please login to continue.', { id: 'auth-error' });
        } else {
          toast.error(message, { id: 'auth-error' });
        }
      }

      if (shouldRedirect && (!isBackgroundOperation || isDashboardOperation)) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }

      // For background operations, silently reject
      return Promise.reject(error);
    }

    // Check if this is a login/register request - don't show toast (component will handle it)
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/user/login') ||
      url.includes('/auth/vendor/login') ||
      url.includes('/auth/admin/login') ||
      url.includes('/auth/user/register') ||
      url.includes('/auth/vendor/register') ||
      url.includes('/auth/vendor/b2b-vendor/register') ||
      url.includes('/auth/vendor/b2b-vendor/login');

    const currentPath = window.location.pathname;
    const isB2BRoute = currentPath.includes('/b2b-vendor');

    const isAuthPage = (currentPath.includes('/login') ||
      currentPath.includes('/register') ||
      currentPath.includes('/forgot-password') ||
      currentPath.includes('/reset-password')) &&
      !isB2BRoute;

    // Show toast for non-auth requests or if explicitly requested via status (like 409 Conflict)
    // For B2B routes, we generally allow the local component to handle toasts, 
    // but 409 is special as it's often a duplicate field error
    if (!isSilent && ((!isAuthRequest && !isAuthPage) || error.response?.status === 409)) {
      toast.error(message, { id: message || 'api-error' });
    } else if (isB2BRoute && (error.response?.status === 403 || error.response?.status === 401)) {
      // For B2B, let the local handler deal with 403 (Pending) and 401 (Invalid)
      // We don't show toast here to avoid duplicates
    }

    return Promise.reject(error);
  }
);

export default api;

