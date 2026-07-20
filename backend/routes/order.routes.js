import express from 'express';
import { initiateCheckout, verifyCheckoutPayment, getMyOrders, getVendorOrders, updateVendorOrderStatus } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Require login for all order routes

// User Routes
router.post('/checkout', initiateCheckout);
router.post('/verify-payment', verifyCheckoutPayment);
router.get('/my-orders', getMyOrders);

// Vendor Routes
router.get('/vendor/orders', getVendorOrders);
router.put('/vendor/orders/:orderId/status', updateVendorOrderStatus);

export default router;
