import express from 'express';
import { getActiveBannersCombined } from '../controllers/defaultBanner.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route to fetch banners (with priority logic)
router.get('/active', asyncHandler(getActiveBannersCombined));

export default router;
