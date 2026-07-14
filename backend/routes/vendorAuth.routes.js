import express from 'express';
import {
  register as registerVendor,
  login,
  logout,
  getMe,
  updateProfile,
  verifyEmail,
  resendOTP,
  forgotPassword,
  resetPassword,
  resetPasswordByPhone,
  checkSubscriptionByEmail,
  checkVendorStatusByEmail,
  deleteAccount
} from '../controllers/vendorAuth.controller.js';
import {
  registerWithPayment,
  register as registerB2BVendor,
  initializePayment,
  createSubscriptionAfterPayment,
  verifySubscription
} from '../controllers/b2bVendorRegistration.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import { rateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', rateLimiter('vendor-register', 50, 600), asyncHandler(registerVendor));
router.post('/b2b-vendor/register', rateLimiter('b2b-vendor-register', 50, 600), asyncHandler(registerB2BVendor));
router.post('/b2b-vendor/initialize-payment', rateLimiter('b2b-vendor-payment', 10, 600), asyncHandler(initializePayment));
router.post('/b2b-vendor/create-subscription-after-payment', rateLimiter('b2b-vendor-subscription', 50, 600), asyncHandler(createSubscriptionAfterPayment));
router.get('/b2b-vendor/verify-subscription/:subscriptionId', rateLimiter('b2b-vendor-verify', 50, 60), asyncHandler(verifySubscription));
router.post('/b2b-vendor/register-with-payment', rateLimiter('b2b-vendor-register', 50, 600), asyncHandler(registerWithPayment));
router.post('/login', rateLimiter('vendor-login', 50, 600), asyncHandler(login));
router.get('/check-subscription/:email', rateLimiter('vendor-check-subscription', 10, 60), asyncHandler(checkSubscriptionByEmail));
router.get('/check-status/:email', rateLimiter('vendor-check-status', 10, 60), asyncHandler(checkVendorStatusByEmail));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-otp', rateLimiter('vendor-otp-resend', 20, 600), asyncHandler(resendOTP));
router.post('/forgot-password', rateLimiter('vendor-forgot-password', 20, 600), asyncHandler(forgotPassword));
router.post('/reset-password', rateLimiter('vendor-reset-password', 20, 600), asyncHandler(resetPassword));
router.post('/reset-password-phone', rateLimiter('vendor-reset-password', 20, 600), asyncHandler(resetPasswordByPhone));

// Protected routes (require authentication)
// Logout uses optional authentication to allow logout even with expired tokens
router.post('/logout', optionalAuthenticate, asyncHandler(logout));
router.get('/me', authenticate, vendorApproved, asyncHandler(getMe));
router.put('/profile', authenticate, vendorApproved, asyncHandler(updateProfile));
router.delete('/delete-account', authenticate, vendorApproved, asyncHandler(deleteAccount));

export default router;

