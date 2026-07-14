import {
    registerUser,
    loginUser,
    getUserById,
    updateUserProfile,
    verifyUserEmail,
    resendUserVerificationOTP,
    getUserAddresses,
    addUserAddress,
    forgotUserPassword,
    resetUserPassword
} from '../services/userAuth.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { sendNotificationToUser } from '../utils/pushNotificationHelper.js';

/**
 * Register a new user
 * POST /api/auth/user/register
 */
export const register = asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json({
        success: true,
        message: result.message,
        data: result
    });
});

/**
 * Login user
 * POST /api/auth/user/login
 */
export const login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email/phone and password'
        });
    }

    try {
        const result = await loginUser(identifier, password);
        try {
            await sendNotificationToUser(result.user._id, {
                title: 'Login Successful',
                body: 'Welcome back! Notifications are enabled for your session.',
                data: {
                    type: 'login',
                    link: '/b2b/catalog'
                }
            });
        } catch (e) {
        }
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED' || error.code === 'PHONE_NOT_VERIFIED') {
            return res.status(403).json({
                success: false,
                message: error.message,
                code: error.code,
                data: { 
                    email: error.email,
                    phone: error.phone
                }
            });
        }
        throw error;
    }
});


/**
 * Logout user
 * POST /api/auth/user/logout
 */
export const logout = asyncHandler(async (req, res) => {
    // In a stateless JWT setup, we can't really "logout" on the server side without a blacklist.
    // But we can return success so the frontend can clear its client-side state.
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * Get current user
 * GET /api/auth/user/me
 */
export const getMe = asyncHandler(async (req, res) => {
    const user = await getUserById(req.user.id);
    res.status(200).json({
        success: true,
        data: { user }
    });
});

/**
 * Update user profile
 * PUT /api/auth/user/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const user = await updateUserProfile(req.user.id, req.body);
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
    });
});

/**
 * Verify email
 * POST /api/auth/user/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await verifyUserEmail(email, otp);
    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: result
    });
});

/**
 * Resend OTP
 * POST /api/auth/user/resend-otp
 */
export const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await resendUserVerificationOTP(email);
    res.status(200).json({
        success: true,
        message: result.message
    });
});

/**
 * Get user addresses
 * GET /api/user/addresses
 */
export const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await getUserAddresses(req.user.id);
    res.status(200).json({
        success: true,
        data: addresses
    });
});

/**
 * Add user address
 * POST /api/user/addresses
 */
export const addAddress = asyncHandler(async (req, res) => {
    const addresses = await addUserAddress(req.user.id, req.body);
    res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: addresses
    });
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const { identifier, email } = req.body;
    const lookupId = identifier || email;
    const result = await forgotUserPassword(lookupId);
    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            email: result.email
        }
    });
});

/**
 * Reset Password
 * POST /api/auth/user/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { identifier, email, otp, newPassword } = req.body;
    const lookupId = identifier || email;
    await resetUserPassword(lookupId, otp, newPassword);
    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
});

/**
 * Reset Password by Phone
 * POST /api/auth/user/reset-password-phone
 */
export const resetPasswordByPhone = asyncHandler(async (req, res) => {
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
    const User = (await import('../models/User.model.js')).default;

    // Find the latest OTP for this phone number
    let storedOtp = await SMSOTP.findOne({
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

    // Find user by phone - try multiple formats
    let user = await User.findOne({
        $or: [
            { phone: normalizedPhone },
            { phone: phoneWithoutCode },
            { phone: `+91${phoneWithoutCode}` }
        ]
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found with this phone number'
        });
    }

    // Hash and save new password
    const { hashPassword } = await import('../utils/bcrypt.util.js');
    user.password = await hashPassword(newPassword);
    await user.save();

    // Clean up used OTPs (both formats)
    await SMSOTP.deleteMany({
        phoneNumber: { $in: [normalizedPhone, phoneWithoutCode, `+91${phoneWithoutCode}`] }
    });

    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
});

/**
 * Delete Account
 * DELETE /api/auth/user/delete-account
 */
export const deleteAccount = asyncHandler(async (req, res) => {
    const User = (await import('../models/User.model.js')).default;
    await User.findByIdAndDelete(req.user.id);
    res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
    });
});

