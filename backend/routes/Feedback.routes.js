import express from 'express';
import {
    createFeedback,
    getAdminFeedbacks,
    updateFeedbackStatus
} from '../controllers/Feedback.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protected route for users and vendors to submit feedback
router.post('/', authenticate, createFeedback);

// Admin routes
router.get('/admin/all', authenticate, authorize('admin'), getAdminFeedbacks);
router.patch('/admin/:id/status', authenticate, authorize('admin'), updateFeedbackStatus);

export default router;
