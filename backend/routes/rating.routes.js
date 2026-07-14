import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import * as ratingController from '../controllers/rating.controller.js';

const router = express.Router();

router.get('/summary', asyncHandler(ratingController.getSummary));
router.get('/user', authenticate, authorize('user', 'vendor'), asyncHandler(ratingController.getUserRating));
router.post('/', authenticate, authorize('user', 'vendor'), asyncHandler(ratingController.submitRating));

export default router;
