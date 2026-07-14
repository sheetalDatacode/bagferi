import express from 'express';
import { getActiveBusinessTypes, createBusinessType, updateBusinessType, deleteBusinessType } from '../controllers/businessType.controller.js';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route
router.get('/', asyncHandler(getActiveBusinessTypes));

// Admin routes
router.post('/admin', authenticate, adminOnly, asyncHandler(createBusinessType));
router.put('/admin/:id', authenticate, adminOnly, asyncHandler(updateBusinessType));
router.delete('/admin/:id', authenticate, adminOnly, asyncHandler(deleteBusinessType));

export default router;
