import express from 'express';
import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand
} from '../controllers/brand.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// Public / Vendor route to fetch brands (for dropdowns)
router.get('/', getBrands);

// Admin only routes for managing brands
router.post('/', authenticate, authorize('admin', 'superadmin'), upload.single('logo'), createBrand);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), upload.single('logo'), updateBrand);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), deleteBrand);

export default router;
