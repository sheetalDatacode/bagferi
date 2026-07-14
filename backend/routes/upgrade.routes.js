import express from 'express';
import UpgradeController from '../controllers/UpgradeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All upgrade routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Initialize upgrade (calculate credit and create Razorpay order)
router.post('/initialize', UpgradeController.initializeUpgrade);

// Verify upgrade payment and activate new plan
router.post('/verify', UpgradeController.verifyUpgrade);

export default router;
