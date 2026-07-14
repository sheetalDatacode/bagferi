import {
  registerVendor,
  loginVendor,
  getVendorById,
  updateVendorProfile,
  verifyVendorEmail,
  resendVendorVerificationOTP,
  forgotVendorPassword,
  resetVendorPassword,
} from '../services/vendorAuth.service.js';
import redisService from '../services/redis.service.js';

/**
 * Helper to clear vendor-related cache
 */
const clearVendorCache = async (vendorId = null) => {
  try {
    const patterns = [
      'home:featured_vendors:*',
      'public:b2b-locations:*',
      'admin:vendors:list:*'
    ];
    if (vendorId) {
      patterns.push(`vendor:details:*${vendorId}*`);
      patterns.push(`admin:vendors:details:*${vendorId}*`);
    } else {
      patterns.push('vendor:details:*');
      patterns.push('admin:vendors:details:*');
    }
    await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
  } catch (error) {
    console.error('Error clearing vendor cache:', error);
  }
};

/**
 * Register a new vendor
 * POST /api/auth/vendor/register
 */
export const register = async (req, res, next) => {
  try {
  const { name, email, phone, password, storeName, storeDescription, address, documents, vendorType, businessTypes, businessType, businessTypeRef, gstNumber, subscriptionPlan, mfgOfWork, agreedToTerms } = req.body;

    const result = await registerVendor({
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      vendorType,
      businessTypes,
      businessType,
      businessTypeRef,
      gstNumber,
      subscriptionPlan,
      
      mfgOfWork,
      agreedToTerms,
    });

    res.status(201).json({
      success: true,
      message: result.message || 'Registration initiated. Please verify your email to complete registration.',
      data: {
        ...result,
      },
    });
  } catch (error) {
    // Handle rate limit errors specifically
    if (error.statusCode === 429 || error.isRateLimitError || error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message || 'Too many OTP requests. Please wait before trying again.',
      });
    }
    next(error);
  }
};

/**
 * Login vendor
 * POST /api/auth/vendor/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body;
    const loginIdentifier = identifier || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/phone and password are required',
      });
    }

    const result = await loginVendor(loginIdentifier, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: result.vendor,
        token: result.token,
      },
    });
  } catch (error) {
    // Preserve status code from service
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Login failed. Please check your credentials.';

    // Include error code and additional data for frontend handling
    const response = {
      success: false,
      message,
    };

    // Add error code if present (for subscription-related errors)
    if (error.code) {
      response.code = error.code;
    }

    // Add expired date if subscription expired
    if (error.code === 'SUBSCRIPTION_EXPIRED' && error.expiredDate) {
      response.expiredDate = error.expiredDate;
    }

    if (error.code === 'PHONE_NOT_VERIFIED' && error.phone) {
      response.data = { phone: error.phone };
    }

    // Don't pass to next() if we can handle it here
    return res.status(statusCode).json(response);
  }
};

/**
 * Logout vendor
 * POST /api/auth/vendor/logout
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
 * Get current logged-in vendor
 * GET /api/auth/vendor/me
 */
export const getMe = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const vendor = await getVendorById(vendorId);

    res.status(200).json({
      success: true,
      message: 'Vendor retrieved successfully',
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor profile
 * PUT /api/auth/vendor/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const updateData = req.body;

    const updatedVendor = await updateVendorProfile(vendorId, updateData);

    // Clear vendor cache
    await clearVendorCache(vendorId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { vendor: updatedVendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify vendor email with OTP
 * POST /api/auth/vendor/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyVendorEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Account created. Please wait for admin approval.',
      data: {
        vendor: result.vendor,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Email verification failed';
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Resend verification OTP
 * POST /api/auth/vendor/resend-otp
 */
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await resendVendorVerificationOTP(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset (sends OTP)
 * POST /api/auth/vendor/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await forgotVendorPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP
 * POST /api/auth/vendor/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    await resetVendorPassword(email, otp, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password by phone with OTP
 * POST /api/auth/vendor/reset-password-phone
 */
export const resetPasswordByPhone = async (req, res, next) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;

    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Normalize phone number - try both with and without +91
    const normalizedPhone = phoneNumber.startsWith('+91')
      ? phoneNumber
      : `+91${phoneNumber}`;
    const phoneWithoutCode = phoneNumber.replace(/^\+91/, '');

    // Import here to avoid circular dependency
    const SMSOTP = (await import('../models/SMSOTP.model.js')).default;
    const Vendor = (await import('../models/Vendor.model.js')).default;

    // Find the latest OTP for this phone number
    const storedOtp = await SMSOTP.findOne({
      phoneNumber: normalizedPhone,
      purpose: { $in: ['password_reset', 'verification', 'login', 'registration'] }
    }).sort({ createdAt: -1 });

    if (!storedOtp) {
      // Try without +91
      const otpWithoutCode = await SMSOTP.findOne({
        phoneNumber: phoneWithoutCode,
        purpose: { $in: ['password_reset', 'verification', 'login', 'registration'] }
      }).sort({ createdAt: -1 });

      if (!otpWithoutCode) {
        return res.status(404).json({
          success: false,
          message: 'OTP not found. Please request a new one.'
        });
      }
      storedOtp = otpWithoutCode;
    }

    // Check expiry
    if (new Date() > storedOtp.expiresAt) {
      return res.status(403).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Find vendor by phone - try multiple formats
    let vendor = await Vendor.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: phoneWithoutCode },
        { phone: `+91${phoneWithoutCode}` }
      ]
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found with this phone number'
      });
    }

    // Hash and save new password
    const { hashPassword } = await import('../utils/bcrypt.util.js');
    vendor.password = await hashPassword(newPassword);
    vendor.isPhoneVerified = true; // Since they verified via OTP to reset
    await vendor.save();

    // Clean up used OTPs (both formats)
    await SMSOTP.deleteMany({
      phoneNumber: { $in: [normalizedPhone, phoneWithoutCode, `+91${phoneWithoutCode}`] }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check subscription status by email (for login page)
 * GET /api/auth/vendor/check-subscription/:email
 */
export const checkSubscriptionByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find vendor by email
    const vendor = await getVendorById(null, email);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
        data: { isExpired: false, hasSubscription: false },
      });
    }

    // Only check for B2B vendors
    if (vendor.vendorType !== 'b2b') {
      return res.status(200).json({
        success: true,
        message: 'Not a B2B vendor',
        data: { isExpired: false, hasSubscription: false, isB2B: false },
      });
    }

    // Get subscription
    const SubscriptionService = (await import('../services/subscription.service.js')).default;
    const subscription = await SubscriptionService.getVendorSubscription(vendor._id);

    if (!subscription) {
      return res.status(200).json({
        success: true,
        message: 'No subscription found',
        data: { isExpired: false, hasSubscription: false, isB2B: true },
      });
    }

    // Check if expired
    const now = new Date();
    const isExpired = subscription.endDate && new Date(subscription.endDate) < now;
    const isActive = subscription.status === 'active';

    return res.status(200).json({
      success: true,
      message: 'Subscription status retrieved',
      data: {
        isExpired,
        hasSubscription: true,
        isB2B: true,
        status: subscription.status,
        endDate: subscription.endDate,
        isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check vendor status by email (for checking if user is already a vendor)
 * GET /api/auth/vendor/check-status/:email
 */
export const checkVendorStatusByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find vendor by email
    try {
      const vendor = await getVendorById(null, email);

      if (!vendor) {
        return res.status(200).json({
          success: true,
          message: 'Vendor not found',
          data: {
            exists: false,
            isApproved: false,
            vendorType: null,
            status: null
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Vendor status retrieved',
        data: {
          exists: true,
          isApproved: vendor.status === 'approved',
          vendorType: vendor.vendorType || 'b2b', // Default to B2B
          status: vendor.status,
          isActive: vendor.isActive,
        },
      });
    } catch (error) {
      // Vendor not found
      if (error.message === 'Vendor not found') {
        return res.status(200).json({
          success: true,
          message: 'Vendor not found',
          data: {
            exists: false,
            isApproved: false,
            vendorType: null,
            status: null
          },
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete vendor account
 * DELETE /api/auth/vendor/delete-account
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const Vendor = (await import('../models/Vendor.model.js')).default;
    await Vendor.findByIdAndDelete(req.user.vendorId);
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

