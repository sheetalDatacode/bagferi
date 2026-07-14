/**
 * Centralized error handling middleware
 * Formats error responses consistently
 */
export const errorHandler = (err, req, res, next) => {
  // Don't log expected 404s for policies (they don't exist yet)
  const isPolicy404 = req.originalUrl?.includes('/admin/policies/') && err.status === 404;

  // Log error for debugging (skip expected policy 404s)
  if (!isPolicy404) {
    const status = err.status || err.statusCode || 500;
    
    if (status >= 500) {
      console.error(`❌ Server Error [${req.method} ${req.originalUrl}]:`, {
        message: err.message,
        name: err.name,
        code: err.code,
        status,
        stack: err.stack,
      });
    } else {
      // Quieter logs for expected client errors (400, 401, 409, etc.)
      console.warn(`⚠️ Client Error [${req.method} ${req.originalUrl}] Status ${status}: ${err.message}`);
    }
  }

  // Default error status and message
  // Preserve status code from service/controller if set
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types (but preserve status if already set)
  if (err.statusCode === 429 || err.isRateLimitError) {
    status = 429;
    message = err.message || 'Too many requests. Please try again later.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    // If it's a Mongoose validation error, extract field messages
    if (err.errors) {
      const errors = Object.values(err.errors).map((e) => e.message);
      message = errors.join(', ');
    }
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate entry for ${field} (Value: ${JSON.stringify(err.keyValue)})`;
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token has expired';
  }

  // Send error response
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

