import express from 'express';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import {
    getAdminReferralSettings,
    updateAdminReferralSettings,
} from '../controllers/adminReferralSettings.controller.js';

const router = express.Router();

router.use(authenticate, adminOnly);
router.get('/', getAdminReferralSettings);
router.put('/', updateAdminReferralSettings);

export default router;
