import { verifyToken } from '../utils/jwt.util.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';
import User from '../models/User.model.js';

/**
 * Optional authentication middleware - verifies JWT token if present but doesn't fail if expired
 * Useful for logout endpoints where we want to allow logout even with expired tokens
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try to verify token, but don't fail if expired
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      // console.log(`[Optional Auth Debug] Token Verified. Role: ${decoded.role}, ID: ${decoded.id || decoded.vendorId}`);

      // Optionally fetch user document if token is valid
      if (decoded.role === 'vendor' && decoded.vendorId) {
        const vendor = await Vendor.findById(decoded.vendorId);
        if (vendor && vendor.isActive) {
          req.userDoc = vendor;
        }
      } else if ((decoded.role === 'admin' || decoded.role === 'superadmin') && decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (admin && admin.isActive) {
          req.userDoc = admin;
        }
      } else if (decoded.role === 'user' && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.userDoc = user;
        }
      }
    } catch (error) {
      console.warn(`[Optional Auth Debug] Token verification failed: ${error.message}`);
      // Token is invalid or expired, but we continue anyway for logout
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    // DEBUG: Log arrival of request and header presence
    // console.log(`[Auth Debug] ${req.method} ${req.url} - Auth Header: ${authHeader ? (authHeader.substring(0, 20) + '...') : 'MISSING'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[Auth Warning] Missing or malformed header for ${req.url}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token || token === 'null' || token === 'undefined') {
      console.warn(`[Auth Warning] Token is invalid string: ${token} for ${req.url}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token provided.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      console.warn(`[Auth Warning] Token verification failed for ${req.url}: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token',
      });
    }

    // console.log(`[Auth Debug] Token Verified. Role: ${decoded.role}, ID: ${decoded.vendorId || decoded.adminId || decoded.id}`);

    // Attach user info to request based on role
    req.user = decoded;

    // Optionally, fetch and attach full user document
    try {
      if (decoded.role === 'vendor' && (decoded.vendorId || decoded.id)) {
        const vendorId = decoded.vendorId || decoded.id;
        const vendor = await Vendor.findById(vendorId);

        if (!vendor) {
          console.warn(`[Auth Middleware] Vendor not found: ${vendorId}`);
          return res.status(401).json({
            success: false,
            message: 'Vendor account not found',
          });
        }

        if (!vendor.isActive) {
          console.warn(`[Auth Middleware] Vendor inactive: ${vendorId} (${vendor.email})`);
          return res.status(401).json({
            success: false,
            message: 'Vendor account is inactive',
          });
        }

        req.userDoc = vendor;
      } else if ((decoded.role === 'admin' || decoded.role === 'superadmin') && (decoded.adminId || decoded.id)) {
        const adminId = decoded.adminId || decoded.id;
        const admin = await Admin.findById(adminId);

        if (!admin || !admin.isActive) {
          console.warn(`[Auth Middleware] Admin ${!admin ? 'not found' : 'inactive'}: ${adminId}`);
          return res.status(401).json({
            success: false,
            message: 'Admin account not found or inactive',
          });
        }
        req.userDoc = admin;
      } else if (decoded.role === 'user' && decoded.id) {
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
          console.warn(`[Auth Middleware] User ${!user ? 'not found' : 'inactive'}: ${decoded.id}`);
          return res.status(401).json({
            success: false,
            message: 'User account not found or inactive',
          });
        }
        req.userDoc = user;
      }
    } catch (dbError) {
      console.error('Error fetching user document in auth middleware:', {
        message: dbError.message,
        role: decoded.role,
        userId: decoded.vendorId || decoded.adminId,
      });
      // Continue without userDoc - some endpoints might not need it
    }

    next();
  } catch (error) {
    console.error('Error in authenticate middleware:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    next(error);
  }
};


// Aliases for compatibility
export const protect = authenticate;
export const protectVendor = authenticate;
export const protectAdmin = authenticate;

/**
 * Authorization middleware - allows only specific roles
 * @param {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.includes('admin') ? [...roles, 'superadmin'] : roles;
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn(`[Auth Denied] ${req.method} ${req.url} - User: ${req.user ? req.user.id : 'NONE'}, Role: ${req.user ? req.user.role : 'NONE'}, Required: [${roles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.',
      });
    }
    next();
  };
};

// Role-specific authorization middlewares
export const adminOnly = authorize('admin');
export const vendorOnly = authorize('vendor');
