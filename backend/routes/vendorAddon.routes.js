import express from 'express';
import VendorAddonController from '../controllers/vendorAddon.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Protected vendor routes
router.use(authenticate);
router.use(authorize('vendor'));

router.get('/available', VendorAddonController.getAvailableAddons);
router.post('/initialize', VendorAddonController.initializeAddonPurchase);
router.post('/verify', VendorAddonController.verifyAddonPayment);
router.post('/purchase-wallet', VendorAddonController.purchaseAddonViaWallet);
router.get('/status', VendorAddonController.getMyAddonsStatus);
router.get('/history', VendorAddonController.getRecentAddons);

export default router;
