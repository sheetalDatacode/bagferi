import express from 'express';
import {
  getB2BProducts,
  getB2BProduct,
  updateB2BProductStatus,
} from '../controllers/b2bProductManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Admin B2B Product Management routes
router.get('/', asyncHandler(getB2BProducts));
router.get('/:id', asyncHandler(getB2BProduct));
router.patch('/:id/status', asyncHandler(updateB2BProductStatus));

export default router;
