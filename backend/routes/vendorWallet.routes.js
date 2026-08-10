import express from 'express';
import {
    getMyWallet,
    initiateRecharge,
    verifyRecharge,
    getPayoutSummary,
    requestPayout
} from '../controllers/vendorWallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(vendorApproved);

router.get('/', getMyWallet);
router.get('/payout-summary', getPayoutSummary);
router.post('/payout-request', requestPayout);
router.post('/recharge/initiate', initiateRecharge);
router.post('/recharge/verify', verifyRecharge);

export default router;
