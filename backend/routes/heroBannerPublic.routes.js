import express from 'express';
import { getActiveBanners } from '../controllers/heroBanner.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes
router.get('/', asyncHandler(getActiveBanners));

export default router;
