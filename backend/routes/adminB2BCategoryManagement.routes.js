import express from 'express';
import {
  getB2BCategories,
  getB2BCategory,
  create,
  update,
  remove,
  addSubcategory,
  removeSubcategory,
  updateSubcategory,
} from '../controllers/b2bCategoryManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// B2B category management routes
router.get('/', asyncHandler(getB2BCategories));
router.get('/:id', asyncHandler(getB2BCategory));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

// Subcategory routes
router.post('/:id/subcategories', asyncHandler(addSubcategory));
router.delete('/:id/subcategories', asyncHandler(removeSubcategory));
router.patch('/:id/subcategories', asyncHandler(updateSubcategory));

export default router;
