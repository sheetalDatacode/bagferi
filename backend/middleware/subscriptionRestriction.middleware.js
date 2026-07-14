import subscriptionRulesService from '../services/subscriptionRules.service.js';
import ShopUnit from '../models/ShopUnit.model.js';

/**
 * Middleware to check if vendor has a shop listing
 * Must be used after authentication middleware
 */
export const requireShopListing = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const shop = await ShopUnit.findOne({ vendorId }).lean();

        if (!shop) {
            return res.status(403).json({
                success: false,
                message: 'Please complete your Shop Listing before adding any items.',
                shopListingRequired: true
            });
        }

        req.shop = shop;
        next();
    } catch (error) {
        console.error('Error in requireShopListing middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create products
 * Must be used after authentication middleware
 */
export const checkProductCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canCreateProduct(vendorId);
        
        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                requiresAddon: result.requiresAddon,
                featureType: result.featureType,
                currentCount: result.currentCount,
                limit: result.limit
            });
        }

        req.subscriptionLimits = {
            products: {
                current: result.currentCount,
                max: result.limit,
                useAddon: result.useAddon,
                addonCount: result.addonCount
            }
        };
        next();
    } catch (error) {
        console.error('Error in checkProductCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create lot/slot listings
 * Must be used after authentication middleware
 */
export const checkLotSlotCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canCreateLotSlot(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                requiresAddon: result.requiresAddon,
                featureType: result.featureType
            });
        }

        req.subscriptionLimits = {
            lotSlot: {
                useAddon: result.useAddon,
                addonCount: result.addonCount
            }
        };

        next();
    } catch (error) {
        console.error('Error in checkLotSlotCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create property listings
 * Also attaches maxImages limit to the request
 * Must be used after authentication middleware
 */
export const checkPropertyCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canCreateProperty(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                requiresUpgrade: result.requiresUpgrade
            });
        }

        // Attach limits to request for use in controller
        req.subscriptionLimits = {
            property: {
                maxImages: result.maxImages,
                useAddon: result.useAddon,
                addonCount: result.addonCount
            }
        };

        next();
    } catch (error) {
        console.error('Error in checkPropertyCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can upload reels
 * Must be used after authentication middleware
 */
export const checkReelUpload = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canUploadReel(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                requiresAddon: result.requiresAddon,
                featureType: result.featureType,
                currentCount: result.currentCount,
                limit: result.limit
            });
        }

        req.subscriptionLimits = {
            reels: {
                current: result.currentCount,
                max: result.limit,
                useAddon: result.useAddon,
                addonCount: result.addonCount
            }
        };

        next();
    } catch (error) {
        console.error('Error in checkReelUpload middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor has any active subscription
 * Generic check - doesn't validate specific feature access
 */
export const requireActiveSubscription = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.checkHasActiveSubscription(vendorId);

        if (!result.hasSubscription) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: true
            });
        }

        // Attach subscription to request
        req.subscription = result.subscription;
        next();
    } catch (error) {
        console.error('Error in requireActiveSubscription middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can use shop slideshow
 * Must be used after authentication middleware
 */
export const checkShopSlideshow = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canUseShopSlideshow(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: result.subscriptionRequired
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkShopSlideshow middleware:', error);
        next(error);
    }
};
