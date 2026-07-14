import express from 'express';
import { uploadMedia } from '../controllers/media.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { uploadReel } from '../utils/upload.util.js';

const router = express.Router();

// Root route for admin media uploads
// Using uploadReel.single('file') to support up to 100MB
router.post('/upload', authenticate, authorize('admin', 'superadmin'), uploadReel.single('file'), uploadMedia);

export default router;

