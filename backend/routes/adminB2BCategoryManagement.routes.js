import express from 'express';
import {
  getB2BCategories,
  getB2BCategory,
  create,
  update,
  remove,
} from '../controllers/b2bCategoryManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// B2B category management routes
router.get('/', asyncHandler(getB2BCategories));
router.get('/:id', asyncHandler(getB2BCategory));
router.post('/', upload.single('image'), asyncHandler(create));
router.put('/:id', upload.single('image'), asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;
