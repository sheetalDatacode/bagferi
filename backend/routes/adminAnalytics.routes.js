import express from 'express';
import { getB2BVendorAnalytics } from '../controllers/b2bAnalytics.controller.js';
import { getClickUsersForVendorAdmin } from '../controllers/vendorAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/b2b-vendors', asyncHandler(getB2BVendorAnalytics));

// Admin view of vendor contact analytics (call/whatsapp/map visitors)
router.get(
  '/vendor-contact/:vendorId/click-users',
  asyncHandler(getClickUsersForVendorAdmin),
);

export default router;
