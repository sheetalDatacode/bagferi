import express from 'express';
import {
  getProducts,
  getProduct,
  create,
  update,
  remove,
} from '../controllers/b2bVendorProducts.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { checkProductCreation, requireShopListing } from '../middleware/subscriptionRestriction.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(protectVendor);
router.use(authorize('vendor'));

// B2B Vendor Product routes
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
// Product creation requires shop listing and subscription check
router.post('/', requireShopListing, checkProductCreation, asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;
