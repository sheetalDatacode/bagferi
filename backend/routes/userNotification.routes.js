import express from 'express';
import {
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
} from '../controllers/userNotification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication and 'user' role
router.use(authenticate, authorize('user'));

router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/read-all', deleteAllRead);

export default router;
