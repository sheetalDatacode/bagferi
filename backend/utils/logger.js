/**
 * Simple logger utility for application logging
 * Provides consistent logging format across the application
 */

const logger = {
  /**
   * Log info messages
   * @param {String} message - Log message
   * @param {Object} meta - Additional metadata (optional)
   */
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, Object.keys(meta).length > 0 ? meta : '');
  },

  /**
   * Log error messages
   * @param {String} message - Error message
   * @param {Error|Object} error - Error object or metadata
   */
  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error);
  },

  /**
   * Log warning messages
   * @param {String} message - Warning message
   * @param {Object} meta - Additional metadata (optional)
   */
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, Object.keys(meta).length > 0 ? meta : '');
  },

  /**
   * Log debug messages (only in development)
   * @param {String} message - Debug message
   * @param {Object} meta - Additional metadata (optional)
   */
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, Object.keys(meta).length > 0 ? meta : '');
    }
  },
};

export default logger;



