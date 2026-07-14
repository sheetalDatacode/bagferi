import { loginAdmin, getAdminById } from '../services/adminAuth.service.js';

/**
 * Login admin
 * POST /api/auth/admin/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, secretCode } = req.body;

    if (!email || !password || !secretCode) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and secret code are required',
      });
    }

    // Verify secret code
    if (secretCode !== process.env.ADMIN_LOGIN_CODE) {
      return res.status(401).json({
        success: false,
        message: 'Invalid secret code',
      });
    }

    const result = await loginAdmin(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: result.admin,
        token: result.token,
      },
    });
  } catch (error) {
    // Preserve status code from service
    const statusCode = error.status || error.statusCode || 500;
    const message = error.message || 'Login failed. Please check your credentials.';

    // Don't pass to next() if we can handle it here
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Logout admin
 * POST /api/auth/admin/logout
 */
export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged-in admin
 * GET /api/auth/admin/me
 */
export const getMe = async (req, res, next) => {
  try {
    const adminId = req.user.adminId;
    const admin = await getAdminById(adminId);

    res.status(200).json({
      success: true,
      message: 'Admin retrieved successfully',
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

