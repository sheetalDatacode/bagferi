import express from 'express';
import AdminB2BVendorSubscriptionController from '../controllers/b2bVendorSubscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All admin routes are protected and authorized for admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all B2B vendor subscriptions
router.get('/', AdminB2BVendorSubscriptionController.getSubscriptions);

// Billing & Invoices
router.get('/vendor/:vendorId/billing', AdminB2BVendorSubscriptionController.getVendorBillingHistory);
router.get('/invoice/:invoiceId', AdminB2BVendorSubscriptionController.downloadVendorInvoice);

export default router;
