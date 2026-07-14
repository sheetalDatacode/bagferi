// API Configuration
// Auto-detect if running on Vercel or production
const isVercel = typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'dealing-india.vercel.app');

const isProduction = typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('dealingindia.com') ||
    window.location.hostname.includes('dealingindia.in') ||
    (window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'));

// Get backend URL - prioritize environment variable, then auto-detect production
const getBackendURL = () => {
  // Highest priority: environment variable (set in Vercel dashboard)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Auto-detect production URL if on Vercel/production
  if (isProduction || isVercel) {
    // Default production backend URL
    const productionURL = 'https://api.dealingindia.com/api';
    console.warn(`⚠️ VITE_API_BASE_URL not set. Using default production URL: ${productionURL}`);
    console.warn('⚠️ Please set VITE_API_BASE_URL in Vercel environment variables for better control.');
    return productionURL;
  }

  // For development, use localhost
  return 'http://localhost:5000/api';
};

const getSocketURL = () => {
  // Highest priority: environment variable (set in Vercel dashboard)
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Auto-detect production URL if on Vercel/production
  if (isProduction || isVercel) {
    // Default production socket URL
    const productionSocketURL = 'https://api.dealingindia.com';
    console.warn(`⚠️ VITE_SOCKET_URL not set. Using default production URL: ${productionSocketURL}`);
    return productionSocketURL;
  }

  // For development, use localhost
  return 'http://localhost:5000';
};

export const API_BASE_URL = getBackendURL();
export const SOCKET_URL = getSocketURL();

// App Constants
export const APP_NAME = 'Dealing India';
export const APP_DESCRIPTION = 'Join India\'s premiere B2B marketplace';

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 0.3,
  NORMAL: 0.5,
  SLOW: 0.8,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

