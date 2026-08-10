import express from 'express';
import { 
    getAdminPayoutRequests, 
    updatePayoutRequestStatus 
} from '../controllers/adminWallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/payout-requests', getAdminPayoutRequests);
router.put('/payout-requests/:id', updatePayoutRequestStatus);

export default router;
