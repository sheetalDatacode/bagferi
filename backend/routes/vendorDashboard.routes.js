import express from 'express';
import { getDashboardData } from '../controllers/b2bVendorDashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Dashboard route
router.get('/', getDashboardData);

export default router;
