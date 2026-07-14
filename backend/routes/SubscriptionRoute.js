import express from 'express';
import {
  createB2BSubscription,
  getB2BSubscription,
  getAllB2BSubscriptions,
  cancelB2BSubscription,
  getAllB2BPlans,
  getB2BSubscriptionDetails,
  getB2BAnalytics,
  manualOverride
} from '../controllers/SubscriptionCtrl.js';
import VendorSubscriptionCtrl from '../controllers/vendorSubscription.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// B2C routes removed for B2B-only focus


/* ============ B2B SUBSCRIPTION ROUTES ============ */

// Get all B2B subscription plans
router.get('/b2b-plans', authorize('vendor', 'admin'), getAllB2BPlans);

// Create a B2B subscription (purchase)
router.post('/createB2BSubscription', authorize('vendor', 'admin'), createB2BSubscription);

// Verify B2B subscription payment
router.post('/verifyB2BPayment', authorize('vendor', 'admin'), (req, res, next) => {
  VendorSubscriptionCtrl.verifyPayment(req, res, next);
});

// Get current vendor's B2B subscriptions
router.get('/getB2BSubscription', authorize('vendor', 'admin'), getB2BSubscription);

// Get all B2B subscriptions (admin only)
router.get('/getAllB2BSubscriptions', authorize('admin'), getAllB2BSubscriptions);

// Get B2B subscription details by ID
router.get('/getB2BSubscription/:subscriptionId', authorize('vendor', 'admin'), getB2BSubscriptionDetails);

// Get B2B subscription analytics (admin only)
router.get('/analytics', authorize('admin'), getB2BAnalytics);

// Manual subscription override (admin only)
router.post('/manual-override/:subscriptionId', authorize('admin'), manualOverride);

// Cancel B2B subscription
router.patch(
  '/cancelB2BSubscription/:subscriptionId',
  authorize('vendor', 'admin'),
  cancelB2BSubscription
);

export default router;
