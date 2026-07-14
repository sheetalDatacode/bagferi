import express from 'express';
import {
    createSecureDeal,
    getSellerSecureDeals,
    getBuyerSecureDeals,
    updateSecureDealStatus,
    uploadSecureDealDocument,
    getAllSecureDeals,
} from '../controllers/secureDeal.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadChatFile } from '../utils/upload.util.js';

const router = express.Router();

// All secure deal routes require authentication
router.use(authenticate);

// Buyer routes
router.post('/', asyncHandler(createSecureDeal));
router.get('/buyer', asyncHandler(getBuyerSecureDeals));

// Seller routes
router.get('/seller', asyncHandler(getSellerSecureDeals));
router.patch('/:id/status', asyncHandler(updateSecureDealStatus));
router.post('/:id/upload', uploadChatFile.single('document'), asyncHandler(uploadSecureDealDocument));

// Admin routes
router.get('/admin/all', authorize('admin'), asyncHandler(getAllSecureDeals));

export default router;
