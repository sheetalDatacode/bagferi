import express from 'express';
import { getAssignedOrders, verifyDeliveryOtp } from '../controllers/staff.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Make sure staff is logged in

router.get('/orders', getAssignedOrders);
router.post('/orders/:orderId/verify-delivery', verifyDeliveryOtp);

export default router;
