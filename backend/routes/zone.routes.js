import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
    createZone,
    getAllZonesAdmin,
    getActiveZones,
    updateZone,
    deleteZone
} from '../controllers/zone.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes (for vendors fetching zones)
router.get('/public/active', asyncHandler(getActiveZones));

// Admin only routes
router.post('/admin', authenticate, authorize('admin'), asyncHandler(createZone));
router.get('/admin', authenticate, authorize('admin'), asyncHandler(getAllZonesAdmin));
router.put('/admin/:id', authenticate, authorize('admin'), asyncHandler(updateZone));
router.delete('/admin/:id', authenticate, authorize('admin'), asyncHandler(deleteZone));

export default router;
