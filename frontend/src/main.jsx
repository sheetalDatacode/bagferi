import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error handler to suppress image 404 errors in console
// These errors are already handled gracefully by components with fallbacks
// Only suppress Cloudinary image 404 errors to avoid cluttering console
const originalError = console.error;
console.error = (...args) => {
  // Filter out Cloudinary image 404 errors (they're handled by error handlers in components)
  const errorMessage = args[0]?.toString() || '';
  const isCloudinaryImage404 = 
    errorMessage.includes('404 (Not Found)') && 
    errorMessage.includes('cloudinary.com');
  
  if (!isCloudinaryImage404) {
    originalError.apply(console, args);
  }
};

// Handle unhandled image load errors - prevent them from showing in console
window.addEventListener('error', (event) => {
  // Suppress Cloudinary image load errors (404s) as they're handled by component error handlers
  if (event.target && event.target.tagName === 'IMG' && event.target.src) {
    const isCloudinaryImage = event.target.src.includes('cloudinary.com');
    if (isCloudinaryImage && event.message && event.message.includes('404')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

