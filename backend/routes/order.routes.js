import express from 'express';
import { initiateCheckout, verifyCheckoutPayment, getMyOrders, getVendorOrders, updateVendorOrderStatus, cancelOrder, getUserWalletBalance, requestExchange, acceptExchange, verifyExchangeOtpByVendor } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Require login for all order routes

// User Routes
router.post('/checkout', initiateCheckout);
router.post('/verify-payment', verifyCheckoutPayment);
router.get('/my-orders', getMyOrders);
router.post('/:orderId/cancel', cancelOrder);
router.post('/:orderId/request-exchange', requestExchange);
router.get('/wallet/balance', getUserWalletBalance);

// Vendor Routes
router.get('/vendor/orders', getVendorOrders);
router.put('/vendor/orders/:orderId/status', updateVendorOrderStatus);
router.post('/vendor/orders/:orderId/accept-exchange', acceptExchange);
router.post('/vendor/orders/:orderId/verify-exchange', verifyExchangeOtpByVendor);

export default router;
