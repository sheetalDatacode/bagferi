/**
 * Role-based authorization middleware
 * @param {...String} roles - Allowed roles
 * @returns {Function} Middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const allowedRoles = roles.includes('admin') ? [...roles, 'superadmin'] : roles;
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * Middleware to check if vendor is approved
 * Only allows access if vendor status is 'approved'
 */
export const vendorApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only for vendors',
    });
  }

  // Check vendor status from userDoc if available
  if (req.userDoc && req.userDoc.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: `Vendor account is ${req.userDoc.status}. Please wait for admin approval.`,
    });
  }

  next();
};

