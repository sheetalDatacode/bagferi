import express from 'express';
import { getCancellationRequests, processCancellationRequest } from '../controllers/adminCancellation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/', getCancellationRequests);
router.put('/:id/process', processCancellationRequest);

export default router;
