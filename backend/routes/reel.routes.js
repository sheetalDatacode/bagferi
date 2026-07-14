import express from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { uploadVideo } from '../utils/upload.util.js';
import {
  uploadReel,
  getMyReels,
  getFeed,
  getReelById,
  likeReel,
  unlikeReel,
  getComments,
  addComment,
  getPlaylistByCategory,
  trackView,
  deleteMyReel,
  replaceSong,
  getReelSharePage,
  reportReel,
  getDailyUploadStatus,
  debugReels
} from '../controllers/reel.controller.js';
import { checkReelUpload } from '../middleware/subscriptionRestriction.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('vendor', 'user'),
  checkReelUpload,
  uploadVideo.single('video'),
  asyncHandler(uploadReel)
);
router.get('/daily-status', authenticate, authorize('vendor', 'user'), asyncHandler(getDailyUploadStatus));
router.get('/my', authenticate, authorize('vendor', 'user'), asyncHandler(getMyReels));

router.get('/debug', asyncHandler(debugReels));
router.get('/feed', optionalAuthenticate, asyncHandler(getFeed));
router.get('/share/:id', asyncHandler(getReelSharePage));
router.get('/playlist/:categoryName', asyncHandler(getPlaylistByCategory));
router.get('/:id', optionalAuthenticate, asyncHandler(getReelById));

router.post('/:id/like', authenticate, authorize('user', 'vendor'), asyncHandler(likeReel));
router.delete('/:id/like', authenticate, authorize('user', 'vendor'), asyncHandler(unlikeReel));
router.get('/:id/comments', asyncHandler(getComments));
router.post('/:id/comments', authenticate, authorize('user', 'vendor'), asyncHandler(addComment));
router.post('/:id/view', optionalAuthenticate, asyncHandler(trackView));
router.delete('/:id', authenticate, authorize('vendor', 'user'), asyncHandler(deleteMyReel));
router.post('/:id/report', authenticate, authorize('user', 'vendor'), asyncHandler(reportReel));
router.post('/:id/replace-song', authenticate, authorize('vendor', 'admin', 'superadmin'), asyncHandler(replaceSong));

export default router;
