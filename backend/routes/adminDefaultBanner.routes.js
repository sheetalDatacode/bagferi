import express from 'express';
import {
    createDefaultBanner,
    getDefaultBanners,
    deleteDefaultBanner
} from '../controllers/defaultBanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', asyncHandler(getDefaultBanners));
router.post('/', upload.single('image'), asyncHandler(createDefaultBanner));
router.delete('/:id', asyncHandler(deleteDefaultBanner));

export default router;
