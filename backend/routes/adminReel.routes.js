import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  adminListReels,
  adminGetReel,
  adminBulkApproveReels,
  adminApproveReel,
  adminRetryYouTubeUpload,
  adminRejectReel,
  adminDeleteReel,
  adminListReelReports,
  adminResolveReelReport,
} from '../controllers/reel.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/', asyncHandler(adminListReels));
router.get('/:id', asyncHandler(adminGetReel));
router.post('/bulk-approve', asyncHandler(adminBulkApproveReels));
router.post('/:id/approve', asyncHandler(adminApproveReel));
router.post('/:id/retry-youtube', asyncHandler(adminRetryYouTubeUpload));
router.post('/:id/reject', asyncHandler(adminRejectReel));

router.delete('/:id', asyncHandler(adminDeleteReel));

// Report Management
router.get('/reports/all', asyncHandler(adminListReelReports));
router.post('/reports/:id/resolve', asyncHandler(adminResolveReelReport));

export default router;
