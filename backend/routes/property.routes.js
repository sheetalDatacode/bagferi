import express from 'express';
import {
    addProperty,
    updateProperty,
    deleteProperty,
    listProperties,
    getPropertyById,
    getAllProperties,
    getPublicPropertyById,
    getPropertySuggestions
} from '../controllers/property.controller.js';
import { authenticate, vendorOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { checkPropertyCreation, requireShopListing } from '../middleware/subscriptionRestriction.middleware.js';

const router = express.Router();

// Vendor routes
// Property creation requires Shop Listing, Premium plan, middleware also attaches max image limit
router.post('/add', authenticate, vendorOnly, requireShopListing, checkPropertyCreation, asyncHandler(addProperty));
// Property update also checks subscription for image limits
router.put('/update/:id', authenticate, vendorOnly, checkPropertyCreation, asyncHandler(updateProperty));
router.delete('/delete/:id', authenticate, vendorOnly, asyncHandler(deleteProperty));
router.get('/list', authenticate, vendorOnly, asyncHandler(listProperties));
router.get('/details/:id', authenticate, vendorOnly, asyncHandler(getPropertyById));

// Public route
router.get('/all', asyncHandler(getAllProperties));
router.get('/suggestions', asyncHandler(getPropertySuggestions));
router.get('/public/details/:id', asyncHandler(getPublicPropertyById));

export default router;
