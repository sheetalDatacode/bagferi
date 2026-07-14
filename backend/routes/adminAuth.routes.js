import express from 'express';
import { login, logout, getMe } from '../controllers/adminAuth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', asyncHandler(login));

// Protected routes (require authentication and admin role)
// Logout uses optional authentication to allow logout even with expired tokens
router.post('/logout', optionalAuthenticate, asyncHandler(logout));
router.get('/me', authenticate, authorize('admin'), asyncHandler(getMe));

export default router;

