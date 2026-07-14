import express from 'express';
import { getDashboardSummary, getSidebarCounts } from '../controllers/adminDashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard-summary', getDashboardSummary);
router.get('/sidebar-counts', getSidebarCounts);

export default router;
