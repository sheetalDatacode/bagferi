import express from 'express';
import { getAllOrders } from '../controllers/adminOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/', getAllOrders);

export default router;
