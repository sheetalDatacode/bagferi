import express from 'express';
import { getSupportConfig, updateSupportConfig } from '../controllers/supportConfig.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route to get support config
router.get('/', asyncHandler(getSupportConfig));

// Protected admin route to update support config
router.put('/admin', authenticate, authorize('admin'), asyncHandler(updateSupportConfig));

export default router;
