import express from 'express';
import {
    getAllBusinessSettings,
    updateBusinessSettings,
    getSettingsBySlug
} from '../controllers/adminBusinessSettings.controller.js';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);

// Admin only routes
router.get('/', adminOnly, asyncHandler(getAllBusinessSettings));
router.put('/update/:id', adminOnly, asyncHandler(updateBusinessSettings));

// Mixed access (can be used by vendor dashboard to get their own limits)
router.get('/:slug', asyncHandler(getSettingsBySlug));

export default router;
