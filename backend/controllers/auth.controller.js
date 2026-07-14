import SMSOTP from '../models/SMSOTP.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import smsService from '../services/sms.service.js';
import notificationService from '../services/notification.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/bcrypt.util.js';

/**
 * Send OTP to mobile number
 * POST /api/auth/send-otp
 */
export const sendOTP = asyncHandler(async (req, res) => {
    const { phoneNumber, purpose } = req.body;

    if (!phoneNumber || !phoneNumber.startsWith('+91') || phoneNumber.length < 13) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid phone number with country code (+91XXXXXXXXXX)'
        });
    }

    // Rate limiting: Max 5 requests per hour per number
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await SMSOTP.countDocuments({
        phoneNumber,
        createdAt: { $gte: oneHourAgo }
    });

    if (recentRequests >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Too many OTP requests. Please try again after an hour.'
        });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database with purpose
    await SMSOTP.create({
        phoneNumber,
        otp,
        expiresAt,
        purpose: purpose || 'verification'
    });

    // Send SMS via SMS India Hub
    const smsSent = await smsService.sendOTP(phoneNumber, otp);

    // Update User/Vendor documents if they exist (Backup storage)
    const phoneWithoutCode = phoneNumber.replace(/^\+91/, '');
    const phoneFormats = [phoneNumber, phoneWithoutCode, '+91' + phoneWithoutCode];
    
    await Promise.all([
        User.updateMany({ phone: { $in: phoneFormats } }, { $set: { otp, otpExpiresAt: expiresAt } }),
        Vendor.updateMany({ phone: { $in: phoneFormats } }, { $set: { otp, otpExpiresAt: expiresAt } })
    ]);

    if (!smsSent && process.env.NODE_ENV === 'production') {
        return res.status(500).json({
            success: false,
            message: 'Failed to send SMS. Please try again later.'
        });
    }

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        // Don't expose OTP in production
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
});

/**
 * Verify OTP and authenticate user
 * POST /api/auth/verify-otp
 */
export const verifyOTP = asyncHandler(async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const cleanPhone = phoneNumber?.trim();
    if (!cleanPhone || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and OTP are required'
        });
    }

    // Fetch the latest OTP for this phone number - handle variations
    const phoneWithoutCode = cleanPhone.replace(/^\+91/, '');
    const phoneFormats = [
        cleanPhone,
        phoneWithoutCode,
        '+91' + phoneWithoutCode
    ];

    console.log('[VerifyOTP Debug] Phone variations:', phoneFormats);
    console.log('[VerifyOTP Debug] Searching for OTP...');

    // 1. Check SMSOTP collection (the primary storage)
    let storedOtp = await SMSOTP.findOne({ 
        phoneNumber: { $in: phoneFormats } 
    }).sort({ createdAt: -1 });

    // 2. Check User/Vendor collections (the new backup storage)
    let profileForOtp = await User.findOne({ phone: { $in: phoneFormats } }).select('+otp +otpExpiresAt');
    if (!profileForOtp) {
        profileForOtp = await Vendor.findOne({ phone: { $in: phoneFormats } }).select('+otp +otpExpiresAt');
    }

    // If no OTP found in SMSOTP, try to use the one from the profile
    if (!storedOtp && profileForOtp && profileForOtp.otp) {
        console.log('[VerifyOTP Debug] OTP not found in SMSOTP, using OTP from profile.');
        storedOtp = {
            otp: profileForOtp.otp,
            expiresAt: profileForOtp.otpExpiresAt,
            phoneNumber: profileForOtp.phone,
            isFromProfile: true
        };
    }

    if (!storedOtp) {
        console.warn('[VerifyOTP Debug] No OTP found in DB for any format:', phoneFormats);
        
        // Check if user is ALREADY verified (handles double-request scenarios)
        const alreadyVerified = await User.findOne({ phone: { $in: phoneFormats }, isPhoneVerified: true });
        const alreadyVerifiedVendor = await Vendor.findOne({ phone: { $in: phoneFormats }, isPhoneVerified: true });
        
        if (alreadyVerified || alreadyVerifiedVendor) {
            console.log('[VerifyOTP Debug] OTP not found but user is already verified. Returning success.');
            const profile = alreadyVerified || alreadyVerifiedVendor;
            const role = alreadyVerifiedVendor ? 'vendor' : 'user';
            
            return res.status(200).json({
                success: true,
                message: 'Mobile already verified.',
                data: {
                    token: generateToken({
                        id: profile._id,
                        email: profile.email,
                        role: profile.role || role
                    }),
                    user: profile,
                    role: role
                }
            });
        }

        return res.status(404).json({
            success: false,
            message: 'OTP not found. Please request a new one.'
        });
    }

    console.log('[VerifyOTP Debug] OTP Found:', {
        source: storedOtp.isFromProfile ? 'Profile' : 'SMSOTP',
        dbPhone: storedOtp.phoneNumber,
        dbOtp: storedOtp.otp,
        inputOtp: otp,
        expiresAt: storedOtp.expiresAt
    });

    // Check attempts (only for SMSOTP)
    if (!storedOtp.isFromProfile && storedOtp.attempts >= 3) {
        return res.status(403).json({
            success: false,
            message: 'Maximum attempts reached. Please request a new OTP.'
        });
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
        if (!storedOtp.isFromProfile) {
            storedOtp.attempts += 1;
            // Since it's a plain object if from profile, we only save if it's a Mongoose doc
            if (typeof storedOtp.save === 'function') {
                await storedOtp.save();
            }
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid OTP. Please try again.'
        });
    }

    // OTP is valid!
    console.log(`[VerifyOTP Audit] OTP matches! Preparing to verify phone for: ${cleanPhone}`);

    // Clean up OTPs for this number
    await SMSOTP.deleteMany({ phoneNumber: { $in: phoneFormats } });

    // Mark as verified in both collections - using multiple phone formats for matching
    // We do this BEFORE fetching the profile to ensure isPhoneVerified is true in the fetched doc
    console.log(`[VerifyOTP Audit] Executing database update to set isPhoneVerified: true for formats:`, phoneFormats);
    
    const updateResult = await Promise.all([
        User.updateMany({ phone: { $in: phoneFormats } }, { $set: { isPhoneVerified: true, otp: null, otpExpiresAt: null } }),
        Vendor.updateMany({ phone: { $in: phoneFormats } }, { $set: { isPhoneVerified: true, otp: null, otpExpiresAt: null } })
    ]);

    console.log(`[VerifyOTP Audit] Database update complete. Result:`, {
        usersUpdated: updateResult[0].modifiedCount,
        vendorsUpdated: updateResult[1].modifiedCount
    });

    // Check if user exists (either as a regular user or a vendor) - use variations for lookup
    let profile = await User.findOne({ phone: { $in: phoneFormats } });
    let role = 'user';

    if (!profile) {
      profile = await Vendor.findOne({ phone: { $in: phoneFormats } });
      if (profile) {
        role = 'vendor';
      }
    }

    if (!profile) {
      // New user registration flow - this will be handled by the frontend
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Please complete registration.',
        isNewUser: true,
        phoneNumber
      });
    }

    // Ensure we have the latest profile data for the response
    const updatedProfile = profile;
    const finalRole = role;

    if (finalRole === 'vendor') {
      // If this is a new B2B vendor (just registered and verified), send admin notification
      if (updatedProfile && updatedProfile.vendorType === 'b2b' && updatedProfile.status === 'pending') {
        try {
          await notificationService.sendBulkNotification({
            type: 'vendor_registration',
            title: 'New B2B Vendor Registration - Phone Verified',
            message: `B2B vendor ${updatedProfile.storeName} (${updatedProfile.email}) has completed phone verification and is pending approval.`,
            actionUrl: `/admin/b2b-vendors/pending`,
            metadata: {
              vendorId: updatedProfile._id.toString(),
              vendorName: updatedProfile.storeName,
              email: updatedProfile.email,
              phone: updatedProfile.phone
            }
          }, 'admins');
        } catch (e) {
          console.error('[VerifyOTP] Failed to send admin notification:', e.message);
        }

        // Process referral if registered with one
        if (updatedProfile.referredByCode) {
          try {
            const { processSuccessfulUserReferral } = await import('../services/referral.service.js');
            await processSuccessfulUserReferral({
              referredUserId: updatedProfile._id.toString(),
              referralCode: updatedProfile.referredByCode,
              referredModel: 'Vendor'
            });
            updatedProfile.referredByCode = null;
            await updatedProfile.save();
            console.log(`[VerifyOTP] Vendor referral processed successfully for vendor ${updatedProfile._id}`);
          } catch (referralError) {
            console.error('[VerifyOTP] Vendor Referral processing skipped/failed:', referralError.message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        isNewUser: false,
        token: generateToken({
          id: updatedProfile._id,
          email: updatedProfile.email,
          role: updatedProfile.role || finalRole
        }),
        user: updatedProfile,
        role: finalRole
      }
    });
});

/**
 * Reset password by phone number with OTP
 * POST /api/auth/reset-password-phone
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

    // Find the latest OTP for this phone number
    const storedOtp = await SMSOTP.findOne({
        phoneNumber,
        purpose: { $in: ['password_reset', 'verification', 'login', 'registration'] }
    }).sort({ createdAt: -1 });

    if (!storedOtp) {
        return res.status(404).json({
            success: false,
            message: 'OTP not found. Please request a new one.'
        });
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

    // Find user by phone
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found with this phone number'
        });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update both collections if found - using multiple phone formats for matching
    const phoneFormats = [
        phoneNumber,
        phoneNumber.replace('+91', ''),
        '+91' + phoneNumber.replace(/^\+91/, '')
    ];

    await Promise.all([
        User.updateMany({ phone: { $in: phoneFormats } }, { $set: { password: hashedPassword, isPhoneVerified: true } }),
        Vendor.updateMany({ phone: { $in: phoneFormats } }, { $set: { password: hashedPassword, isPhoneVerified: true } })
    ]);

    // Clean up used OTPs
    await SMSOTP.deleteMany({ phoneNumber });

    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
});
