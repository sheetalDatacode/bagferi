import express from 'express';
import VendorSubscriptionController from '../controllers/vendorSubscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { logSubscriptionChange } from '../middleware/subscriptionAudit.middleware.js';

const router = express.Router();

// All vendor routes are protected
router.use(authenticate);
router.use(authorize('vendor'));

router.get('/tiers', VendorSubscriptionController.getTiers);
router.get('/current', VendorSubscriptionController.getCurrentSubscription);
// New endpoint for complete subscription status with listing limits
router.get('/status', VendorSubscriptionController.getSubscriptionStatus);
router.get('/billing-history', VendorSubscriptionController.getBillingHistory);
router.post('/initialize', VendorSubscriptionController.initializeSubscription);
router.post('/verify-payment', VendorSubscriptionController.verifyPayment);
router.post('/subscribe', logSubscriptionChange('vendor_subscribe'), VendorSubscriptionController.subscribe);
router.post('/upgrade', logSubscriptionChange('vendor_upgrade'), VendorSubscriptionController.upgrade);
router.post('/purchase-wallet', logSubscriptionChange('vendor_wallet_purchase'), VendorSubscriptionController.purchaseViaWallet);
router.post('/cancel', logSubscriptionChange('vendor_cancel'), VendorSubscriptionController.cancelSubscription);
router.put('/renewal', logSubscriptionChange('vendor_renewal_update'), VendorSubscriptionController.updateRenewal);
router.get('/invoice/:invoiceId', VendorSubscriptionController.downloadInvoice);

export default router;
