import express from 'express';
import {
    getB2BVendorsList,
    getPendingB2BVendors,
    removeB2BVendor,
    getSignedDocumentUrl,
    updateStatus,
    getVendor,
    toggleActive,
    getVendorDashboardForAdmin,
    getVendorFollowersForAdmin
} from '../controllers/vendorManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// B2B vendor management routes
router.post('/document-url', asyncHandler(getSignedDocumentUrl));
router.get('/', asyncHandler(getB2BVendorsList));
router.get('/pending', asyncHandler(getPendingB2BVendors));
router.put('/:id/status', asyncHandler(updateStatus));
router.patch('/:id/toggle-active', asyncHandler(toggleActive));
router.get('/:id/dashboard', asyncHandler(getVendorDashboardForAdmin));
router.get('/:id/followers', asyncHandler(getVendorFollowersForAdmin));
router.get('/:id', asyncHandler(getVendor));
router.delete('/:id', asyncHandler(removeB2BVendor));

export default router;
