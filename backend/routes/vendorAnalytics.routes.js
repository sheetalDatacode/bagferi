import express from 'express';
import { trackContactClick, getVendorAnalytics, getClickUsers, getEnquiryStats, unlockEnquiry } from '../controllers/vendorAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoint - track click (optional auth to identify user)
router.post('/track-click', optionalAuthenticate, trackContactClick);

// Protected endpoint - get analytics (vendor only)
router.get('/', authenticate, authorize('vendor'), getVendorAnalytics);

// Protected endpoint - list users who clicked (dedup by user+date)
router.get('/click-users', authenticate, authorize('vendor'), getClickUsers);

// Protected endpoint - enquiry stats (unique enquiries today + monthly + quota)
router.get('/enquiry-stats', authenticate, authorize('vendor'), getEnquiryStats);

// Protected endpoint - unlock a specific enquiry (deduct quota)
router.post('/unlock-enquiry', authenticate, authorize('vendor'), unlockEnquiry);

export default router;
