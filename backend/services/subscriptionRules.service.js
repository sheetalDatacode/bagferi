/**
 * Subscription Rules Service
 * Centralized business logic for subscription-based restrictions
 * 
 * BUSINESS RULES:
 * - All plans valid for 1 year
 * - Without active subscription: No listings allowed
 * 
 * TEXTILE VENDOR PLANS:
 * - BASIC: Max 50 products, NO lot/slot
 * - SILVER: Max 100 products, NO lot/slot  
 * - DIAMOND: Unlimited products, Lot/Slot allowed
 * 
 * PROPERTY VENDOR PLANS:
 * - DEVELOPER PREMIUM: Unlimited properties, Max 50 images per property
 * - BROKER PREMIUM: Unlimited properties, Max 5 images per property
 */

import Vendor from '../models/Vendor.model.js';
import B2BAddonPlan from '../models/B2BAddonPlan.model.js';
import B2BSettings from '../models/B2BSettings.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
import ShopUnit from '../models/ShopUnit.model.js';
import Reel from '../models/Reel.model.js';
import VendorAddon from '../models/VendorAddon.model.js';
import Property from '../models/Property.model.js';
import vendorAddonService from './vendorAddon.service.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import vendorWalletService from './vendorWallet.service.js';
import * as emailService from './email.service.js';

// Plan type constants
export const PLAN_TYPES = {
    BASIC: 'basic',
    SILVER: 'silver',
    DIAMOND: 'diamond',
    PREMIUM: 'premium'
};

// Business type constants
export const BUSINESS_TYPES = {
    TEXTILE: 'textile',
    DEVELOPER: 'developer',
    BROKER: 'property-broker',
    PROPERTY_BROKER: 'property-broker'
};


class SubscriptionRulesService {
    /**
     * Get vendor's active subscription with plan details
     * @param {String} vendorId - Vendor ID
     * @returns {Object|null} Subscription details or null
     */
    async getActiveSubscription(vendorId) {
        try {
            const vendor = await Vendor.findById(vendorId)
                .select('currentSubscription businessType businessTypeRef')
                .lean();

            if (!vendor) {
                return null;
            }

            let subscription = null;

            // Priority 1: Check vendor's currentSubscription reference
            if (vendor.currentSubscription) {
                subscription = await VendorSubscription.findById(vendor.currentSubscription)
                    .populate({
                        path: 'planId',
                        select: 'name duration price features isActive productLimit propertyLimit reelsLimit lotSlotLimit imagesPerListing enquiryLimit shopSlideshow'
                    })
                    .lean();
            }

            // Priority 2: Find active subscription
            if (!subscription || subscription.status !== 'active') {
                subscription = await VendorSubscription.findOne({
                    vendorId,
                    status: 'active'
                })
                    .populate({
                        path: 'planId',
                        select: 'name duration price features isActive productLimit propertyLimit reelsLimit lotSlotLimit imagesPerListing enquiryLimit shopSlideshow'
                    })
                    .sort({ createdAt: -1 })
                    .lean();
            }

            if (!subscription) {
                return null;
            }

            // Check if subscription is valid (not expired and active)
            const now = new Date();
            if (subscription.status !== 'active' || new Date(subscription.endDate) < now) {
                return null;
            }

            return {
                subscription,
                plan: subscription.planId,
                vendor: {
                    businessType: vendor.businessType,
                    businessTypeRef: vendor.businessTypeRef
                }
            };
        } catch (error) {
            console.error('Error getting active subscription:', error);
            return null;
        }
    }

    /**
     * Determine plan type from plan name
     * @param {String} planName - Plan name from database
     * @returns {String} Plan type constant
     */
    determinePlanType(planName) {
        if (!planName) return null;

        const name = planName.toLowerCase();

        if (name.includes('diamond')) return PLAN_TYPES.DIAMOND;
        if (name.includes('silver')) return PLAN_TYPES.SILVER;
        if (name.includes('basic')) return PLAN_TYPES.BASIC;
        if (name.includes('premium')) return PLAN_TYPES.PREMIUM;

        // Default mappings based on duration for backward compatibility
        return PLAN_TYPES.BASIC;
    }

    /**
     * Determine business type slug from vendor data
     * @param {String} businessType - Business type string
     * @returns {String} Normalized business type slug
     */
    normalizeBusinessType(businessType) {
        if (!businessType) return BUSINESS_TYPES.TEXTILE;

        const bt = businessType.toLowerCase().trim();

        if (bt.includes('developer')) return BUSINESS_TYPES.DEVELOPER;
        if (bt.includes('broker')) return BUSINESS_TYPES.BROKER;
        if (bt.includes('property')) return BUSINESS_TYPES.DEVELOPER; // Default for property

        return BUSINESS_TYPES.TEXTILE;
    }

    /**
     * Check if vendor has active subscription
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { hasSubscription, message, subscription }
     */
    async checkHasActiveSubscription(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                hasSubscription: false,
                message: 'Active subscription required to access this feature.',
                subscription: null
            };
        }

        return {
            hasSubscription: true,
            message: 'Active subscription found.',
            subscription: subData.subscription
        };
    }

    /**
     * Check if vendor can create/update their Shop Listing
     * @param {String} vendorId 
     */
    async canListShop(vendorId) {
        try {
            const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
            if (!vendor) return { allowed: false, message: 'Vendor not found' };

            // 1. Regular check: If they have a subscription, they can always list shop
            const subData = await this.getActiveSubscription(vendorId);
            if (subData) return { allowed: true };

            // 3. New Policy: Allow shop listing for free for all vendors (as of April 2026)
            return { 
                allowed: true, 
                message: 'Shop listing is free for all vendors.' 
            };
        } catch (error) {
            console.error('Error in canListShop rule:', error);
            return { allowed: false, message: 'Eligibility check failed.' };
        }
    }

    /**
     * Check if vendor can create a new product listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, currentCount, limit }
     */
    async canCreateProduct(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'products')
            ]);

            // 1. MUST HAVE SUBSCRIPTION
            if (!subData) {
                const currentCount = await this.getProductCount(vendorId);
                // If no subscription, check for addons only
                if (addonCount > 0) return { allowed: true, useAddon: true, currentCount, limit: 0, addonCount };
                
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add products.',
                    subscriptionRequired: true
                };
            }

            // 2. Subscription Limit Check (Bypassing hard business type block to allow flexibility)
            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await this.getProductCount(vendorId, sinceDate);
            
            // 🔹 Dynamic Limit Check from DB
            const subLimit = plan.productLimit === 'unlimited' ? -1 : (Number(plan.productLimit) || 0);

            // 2. Check Subscription limit
            if (subLimit === -1 || currentCount < subLimit) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            // 3. Check Addon pool
            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Product listing limit reached. Please upgrade your plan or purchase an add-on.',
                currentCount, 
                limit: subLimit,
                requiresAddon: true,
                featureType: 'products'
            };
        } catch (error) {
            console.error('Error in canCreateProduct:', error);
            return { allowed: false, message: 'Encryption error check.' };
        }
    }

    /**
     * Check if vendor can create lot/slot listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message }
     */
    async canCreateLotSlot(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'lot_slot')
            ]);

            // 1. Subscription Check (Bypassing hard business type block)
            if (subData) {
                // Logic removed specialized block to allow flexible modules
            }

            // 2. MUST HAVE SUBSCRIPTION
            if (!subData) {
                // If no subscription, check for addons only
                if (addonCount > 0) return { allowed: true, useAddon: true, addonCount };
                
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add Lot/Slot listings.',
                    subscriptionRequired: true
                };
            }

            // 3. Check Subscription allowance
            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await this.getLotSlotCount(vendorId, sinceDate);
            const subLimit = plan.lotSlotLimit === 'unlimited' ? -1 : (Number(plan.lotSlotLimit) || 0);

            if (subLimit === -1 || (subLimit > 0 && currentCount < subLimit)) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            // 4. Check Addon pool
            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Lot/Slot listing limit reached for your current plan. Please upgrade or purchase a Lot/Slot add-on.',
                currentCount,
                limit: subLimit,
                requiresAddon: true,
                featureType: 'lot_slot'
            };
        } catch (error) {
            console.error('Error in canCreateLotSlot:', error);
            return { allowed: false, message: 'Limit check failed.' };
        }
    }
    /**
     * Check if vendor can create property listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, maxImages }
     */
    async canCreateProperty(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'property')
            ]);
            
            // 1. Check for addon logic if NO subscription at all
            if (!subData && addonCount > 0) {
                const currentCount = await Property.countDocuments({ vendorId, isActive: { $ne: false } });
                return { 
                    allowed: true, 
                    useAddon: true, 
                    current: currentCount, 
                    limit: 0, 
                    addonCount,
                    maxImages: 50 // Default for property addons
                };
            }

            if (!subData) {
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add properties.',
                    subscriptionRequired: true
                };
            }

            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await Property.countDocuments({ 
                vendorId, 
                isActive: { $ne: false },
                createdAt: { $gte: sinceDate }
            });

            // 🔹 Determine Property Limit
            const subLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);
            const maxImages = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
            
            // 2. Try to use Subscription allowance
            // Allow if subLimit is -1 (unlimited) or if currentCount < subLimit
            if (subLimit === -1 || (subLimit > 0 && currentCount < subLimit)) {
                return { 
                    allowed: true, 
                    maxImages: maxImages,
                    current: currentCount,
                    limit: subLimit,
                    remaining: subLimit === -1 ? -1 : (subLimit - currentCount)
                };
            }

            // 3. Try to use Addon pool
            if (addonCount > 0) {
                return { 
                    allowed: true, 
                    useAddon: true, 
                    maxImages: maxImages || 50,
                    current: currentCount,
                    limit: subLimit,
                    addonCount
                };
            }

            // 4. No luck - return descriptive error
            if (subLimit === 0) {
                return { 
                    allowed: false, 
                    message: 'Property listings are not included in your current plan. Please upgrade or purchase an add-on.',
                    requiresUpgrade: true
                };
            }

            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'property',
                message: `Property listing limit reached (${currentCount}/${subLimit}). Please purchase an add-on pack.`,
                maxImages
            };
        } catch (error) {
            console.error('Error in canCreateProperty:', error);
            return { allowed: false, message: 'Access check failed.' }
        }
    }

    /**
     * Check if vendor can create a job
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, useAddon, addonCount }
     */
    async canCreateJob(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'jobs')
            ]);

            let subLimit = 0;
            let currentCount = 0;
            if (subData) {
                const plan = subData.plan || {};
                const sinceDate = subData.subscription?.startDate || new Date(0);
                const { default: Job } = await import('../models/Job.model.js');
                currentCount = await Job.countDocuments({
                    vendorId,
                    isDeleted: false,
                    createdAt: { $gte: sinceDate }
                });
                subLimit = plan.jobLimit === 'unlimited' ? -1 : (Number(plan.jobLimit) || 0);
            } else {
                if (addonCount === 0) {
                    return { 
                        allowed: false, 
                        message: 'An active subscription plan or add-on is required to post jobs.',
                        subscriptionRequired: true
                    };
                }
                subLimit = 0;
                const { default: Job } = await import('../models/Job.model.js');
                currentCount = await Job.countDocuments({
                    vendorId,
                    isDeleted: false
                });
            }

            if (subLimit === -1 || (subLimit > 0 && currentCount < subLimit)) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Job posting limit reached. Purchase a Job Add-on to upload more.',
                requiresAddon: true,
                featureType: 'jobs'
            };
        } catch (error) {
            console.error('Error in canCreateJob:', error);
            return { allowed: false, message: 'Limit check failed.' };
        }
    }

    /**
     * Check if vendor can upload a reel
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, useAddon, addonCount }
     */
    async canUploadReel(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'reels')
            ]);

            // Reels are typically limited or infinite based on plan.
            let subLimit = 0;
            let currentCount = 0;
            if (subData) {
                const plan = subData.plan || {};
                const sinceDate = subData.subscription?.startDate || new Date(0);
                currentCount = await this.getReelCount(vendorId, sinceDate);
                subLimit = plan.reelsLimit === 'unlimited' ? -1 : (Number(plan.reelsLimit) || 0);
            } else {
                // Return false if no subscription and no addon
                if (addonCount === 0) {
                    return { 
                        allowed: false, 
                        message: 'An active subscription plan is required to upload reels.',
                        subscriptionRequired: true
                    };
                }
                subLimit = 0;
            }

            if (subLimit === -1 || currentCount < subLimit) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Reel upload limit reached. Purchase a Reel Pack to upload more.',
                requiresAddon: true,
                featureType: 'reels'
            };
        } catch (error) {
            console.error('Error in canUploadReel:', error);
            return { allowed: false, message: 'Limit check failed.' };
        }
    }

    /**
     * Get current product count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} Product count
     */
    async getProductCount(vendorId, sinceDate = null) {
        try {
            const query = {
                vendorId,
                isActive: { $ne: false },
                formType: { $ne: 'property' }
            };

            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }

            return await Product.countDocuments(query);
        } catch (error) {
            console.error('Error counting products:', error);
            return 0;
        }
    }

    /**
     * Get current lot/slot count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} LotSlot count
     */
    async getLotSlotCount(vendorId, sinceDate = null) {
        try {
            const query = { vendorId };
            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }
            return await LotSlot.countDocuments(query);
        } catch (error) {
            console.error('Error counting lot/slots:', error);
            return 0;
        }
    }

    /**
     * Get current reel count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} Reel count
     */
    async getReelCount(vendorId, sinceDate = null) {
        try {
            const query = {
                uploaderId: vendorId,
                uploaderType: 'vendor'
            };

            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }

            return await Reel.countDocuments(query);
        } catch (error) {
            console.error('Error counting reels:', error);
            return 0;
        }
    }

    /**
     * Get subscription status summary for vendor
     * Includes all limits and current usage
     * @param {String} vendorId - Vendor ID
     * @returns {Object} Complete subscription status
     */
    async getSubscriptionStatus(vendorId) {
        const [subData, shop, addons] = await Promise.all([
            this.getActiveSubscription(vendorId),
            ShopUnit.findOne({ vendorId }).select('_id').lean(),
            VendorAddon.find({ 
                vendorId, 
                status: { $in: ['active', 'consumed'] } 
            }).lean()
        ]);

        const hasShop = !!shop;

        /**
         * calculateFeatureUsage helper
         * Safely calculates combined limit, current usage, and remaining balance
         * preventing double counting between plan slots and global addons.
         */
        const calculateFeatureUsage = (subLimit, countInDb, featAddonStats) => {
            const totalLimit = subLimit === -1 ? -1 : (subLimit + featAddonStats.total);
            if (totalLimit === -1) return { limit: -1, current: countInDb, remaining: -1 };

            // Total Remaining = (Units left in Plan Slots) + (Units left in Addon Pool)
            // Units left in Plan = max(0, subLimit - countInDb)
            const planRemaining = Math.max(0, subLimit - countInDb);
            const totalRemaining = planRemaining + featAddonStats.remaining;

            // Current used = TotalLimit - TotalRemaining
            const current = Math.max(0, totalLimit - totalRemaining);

            return { limit: totalLimit, current, remaining: totalRemaining };
        };

        // 🔹 Correct Addon Stats: Calculate Total Capacity, Remaining Units, and Historical Usage
        const addonStats = addons.reduce((acc, a) => {
            const ft = a.featureType;
            if (acc[ft]) {
                acc[ft].total += a.totalQuantity;
                acc[ft].used += (a.usedCount || 0);
                acc[ft].remaining += Math.max(0, a.totalQuantity - (a.usedCount || 0));
            }
            return acc;
        }, {
            reels: { total: 0, used: 0, remaining: 0 },
            products: { total: 0, used: 0, remaining: 0 },
            lot_slot: { total: 0, used: 0, remaining: 0 },
            property: { total: 0, used: 0, remaining: 0 },
            enquiry: { total: 0, used: 0, remaining: 0 },
            jobs: { total: 0, used: 0, remaining: 0 }
        });

        // For backward compatibility within some logic
        const addonBalances = {
            reels: addonStats.reels.remaining,
            products: addonStats.products.remaining,
            lot_slot: addonStats.lot_slot.remaining,
            property: addonStats.property.remaining,
            enquiry: addonStats.enquiry.remaining,
            jobs: addonStats.jobs.remaining
        };

        if (!subData) {
            // Fetch vendor info to ensure businessType is available even without subscription
            const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
            const businessType = vendor?.businessType;

            const productCount = await this.getProductCount(vendorId);
            const reelCount = await this.getReelCount(vendorId);
            const lotSlotCount = await this.getLotSlotCount(vendorId);
            const propertyCount = await Property.countDocuments({ vendorId, isActive: { $ne: false } });
            
            const { default: Job } = await import('../models/Job.model.js');
            const jobCount = await Job.countDocuments({ vendorId, isDeleted: false });

            // Check if admin hasn't configured any plans for this business type
            const shopCheck = await this.canListShop(vendorId);

        const hasAddons = (addonStats.products.total + addonStats.reels.total + addonStats.lot_slot.total + addonStats.property.total + addonStats.jobs.total) > 0;

        const productUsage = calculateFeatureUsage(0, productCount, addonStats.products);
        const lotSlotUsage = calculateFeatureUsage(0, lotSlotCount, addonStats.lot_slot);
        const propertyUsage = calculateFeatureUsage(0, propertyCount, addonStats.property);
        const reelUsage = calculateFeatureUsage(0, reelCount, addonStats.reels);
        const jobUsage = calculateFeatureUsage(0, jobCount, addonStats.jobs);

        return {
            isActive: hasAddons,
            hasSubscription: hasAddons,
                isEligibleForShopListing: shopCheck.allowed,
                hasShop,
                plan: { id: null, name: 'No Active Plan', type: 'none', expiresAt: null },
                businessType: businessType || 'textile',
                limits: {
                    products: { 
                        allowed: productUsage.limit !== 0, 
                        limit: productUsage.limit, 
                        current: productUsage.current, 
                        remaining: productUsage.remaining,
                        hasAddon: addonStats.products.total > 0
                    },
                    lotSlot: { 
                        allowed: lotSlotUsage.limit !== 0, 
                        limit: lotSlotUsage.limit,
                        current: lotSlotUsage.current, 
                        remaining: lotSlotUsage.remaining,
                        hasAddon: addonStats.lot_slot.total > 0
                    },
                    properties: { 
                        allowed: propertyUsage.limit !== 0, 
                        limit: propertyUsage.limit,
                        current: propertyUsage.current,
                        remaining: propertyUsage.remaining,
                        hasAddon: addonStats.property.total > 0,
                        maxImages: 50 
                    },
                    reels: { 
                        allowed: reelUsage.limit !== 0, 
                        limit: reelUsage.limit, 
                        current: reelUsage.current,
                        remaining: reelUsage.remaining,
                        hasAddon: addonStats.reels.total > 0
                    },
                    enquiry: {
                        allowed: false,
                        limit: 0,
                        planLimit: 0,
                        addonUnits: addonStats.enquiry.remaining,
                        isUnlimited: false
                    },
                    jobs: {
                        allowed: jobUsage.limit !== 0,
                        limit: jobUsage.limit,
                        current: jobUsage.current,
                        remaining: jobUsage.remaining,
                        hasAddon: addonStats.jobs.total > 0
                    }
                },
                addons: addonBalances
            };
        }

        const plan = subData.plan || {};
        const sinceDate = subData.subscription?.startDate || new Date(0);

        const productCount = await this.getProductCount(vendorId, sinceDate);
        const lotSlotCount = await this.getLotSlotCount(vendorId, sinceDate);
        const reelCount = await this.getReelCount(vendorId, sinceDate);
        const propertyCount = await Property.countDocuments({ 
            vendorId, 
            isActive: { $ne: false },
            createdAt: { $gte: sinceDate }
        });
        
        const { default: Job } = await import('../models/Job.model.js');
        const jobCount = await Job.countDocuments({ 
            vendorId, 
            isDeleted: false,
            createdAt: { $gte: sinceDate }
        });

        // 🔹 Rule: Total Capacity = Plan Limit + ALL Addon Quantities
        const subProductLimit = plan.productLimit === 'unlimited' ? -1 : (Number(plan.productLimit) || 0);
        const subPropertyLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);
        const subLotSlotLimit = plan.lotSlotLimit === 'unlimited' ? -1 : (Number(plan.lotSlotLimit) || 0);
        const subReelLimit = plan.reelsLimit === 'unlimited' ? -1 : (Number(plan.reelsLimit) || 0);
        const subEnquiryLimit = plan.enquiryLimit === 'unlimited' ? -1 : (Number(plan.enquiryLimit) || 0);
        const subJobLimit = plan.jobLimit === 'unlimited' ? -1 : (Number(plan.jobLimit) || 0);

        const productUsage = calculateFeatureUsage(subProductLimit, productCount, addonStats.products);
        const lotSlotUsage = calculateFeatureUsage(subLotSlotLimit, lotSlotCount, addonStats.lot_slot);
        const propertyUsage = calculateFeatureUsage(subPropertyLimit, propertyCount, addonStats.property);
        const reelUsage = calculateFeatureUsage(subReelLimit, reelCount, addonStats.reels);
        const jobUsage = calculateFeatureUsage(subJobLimit, jobCount, addonStats.jobs);

        const imagesPerListing = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
        const shopSlideshow = !!plan.shopSlideshow;

        return {
            isActive: true,
            hasSubscription: true,
            hasShop,
            plan: {
                id: plan._id,
                name: plan.name,
                type: this.determinePlanType(plan.name),
                expiresAt: subData.subscription?.endDate
            },
            businessType: subData.vendor?.businessType,
            limits: {
                products: {
                    allowed: productUsage.limit !== 0,
                    limit: productUsage.limit,
                    current: productUsage.current,
                    remaining: productUsage.remaining,
                    hasAddon: addonStats.products.total > 0,
                    maxImages: imagesPerListing
                },
                lotSlot: {
                    allowed: lotSlotUsage.limit !== 0,
                    limit: lotSlotUsage.limit,
                    current: lotSlotUsage.current,
                    remaining: lotSlotUsage.remaining,
                    hasAddon: addonStats.lot_slot.total > 0
                },
                properties: {
                    allowed: propertyUsage.limit !== 0 || addonStats.property.total > 0,
                    limit: propertyUsage.limit,
                    current: propertyUsage.current,
                    remaining: propertyUsage.remaining,
                    hasAddon: addonStats.property.total > 0,
                    maxImages: imagesPerListing || 50
                },
                reels: {
                    allowed: subReelLimit !== 0 || addonStats.reels.total > 0,
                    limit: reelUsage.limit,
                    current: reelUsage.current,
                    remaining: reelUsage.remaining,
                    hasAddon: addonStats.reels.total > 0
                },
                shopSlideshow: shopSlideshow,
                enquiry: {
                    // Plan-defined enquiry quota (per subscription cycle)
                    // -1 = unlimited, 0 = not included, N = capped at N
                    isUnlimited: subEnquiryLimit === -1,
                    planLimit: subEnquiryLimit,
                    addonUnits: addonStats.enquiry.remaining,
                    // Effective: if plan says unlimited → unlimited; else plan + addon pool
                    effectiveLimit: subEnquiryLimit === -1 ? -1 : (subEnquiryLimit + addonStats.enquiry.remaining),
                    allowed: subEnquiryLimit !== 0 || addonStats.enquiry.remaining > 0
                },
                jobs: {
                    allowed: jobUsage.limit !== 0,
                    limit: jobUsage.limit,
                    current: jobUsage.current,
                    remaining: jobUsage.remaining,
                    hasAddon: addonStats.jobs.total > 0
                }
            },
            addons: addonBalances
        };
    }

    async canUseShopSlideshow(vendorId) {
        try {
            const subData = await this.getActiveSubscription(vendorId);

            // Allow shop slideshows for free to ensure all vendors can present their business identity
            return { allowed: true };
        } catch (error) {
            console.error('Error in canUseShopSlideshow:', error);
            return { allowed: false, message: 'Access check failed.' };
        }
    }

    /**
     * Consume one enquiry unit
     * Priority: 1. Subscription Plan Quota, 2. Add-on Quota, 3. Wallet Balance
     * @param {String} vendorId 
     * @returns {Promise<Boolean>} Success
     */
    async consumeEnquiry(vendorId, clickType = null) {
        try {
            const subData = await this.getActiveSubscription(vendorId);
            
            // 1. Check Plan Quota
            if (subData && subData.plan) {
                const plan = subData.plan;
                const subLimit = plan.enquiryLimit === 'unlimited' ? -1 : (Number(plan.enquiryLimit) || 0);
                const subDoc = await VendorSubscription.findById(subData.subscription._id);

                if (subDoc) {
                    const used = subDoc.usage?.enquiriesUsed || 0;
                    
                    if (subLimit === -1 || used < subLimit) {
                        // Use plan quota
                        subDoc.usage = {
                            ...(subDoc.usage || {}),
                            enquiriesUsed: used + 1
                        };
                        await subDoc.save();
                        return true;
                    }
                }
            }

            // 2. Check Addon Quota
            const addonConsumed = await vendorAddonService.consumeAddonUnit(vendorId, 'enquiry');
            if (addonConsumed) return true;

            // 3. Fallback: Wallet Deduction
            // If plan has a price, use it. Otherwise use global default from settings.
            const b2bSettings = await B2BSettings.findOne().lean();
            const defaultPrice = b2bSettings?.defaultEnquiryPrice ?? 1;

            const price = (subData && subData.plan && subData.plan.enquiryPrice > 0) 
                ? subData.plan.enquiryPrice 
                : defaultPrice; 
            
            try {
                await vendorWalletService.payViaWallet(
                    vendorId,
                    price,
                    `Automatic Enquiry Unlock (Pay-Per-Use)${clickType ? ` - ${clickType.toUpperCase()}` : ''}`,
                    `ENQ-${Date.now()}`,
                    'enquiry_unlock',
                    { clickType }
                );

                // Notify vendor in background
                this.notifyVendorOfWalletDeduction(vendorId, price).catch(err => {
                    console.error('Failed to notify vendor of wallet deduction:', err);
                });

                return true;
            } catch (walletError) {
                console.warn(`Wallet deduction failed for vendor ${vendorId}:`, walletError.message);
                return false;
            }

            return false;
        } catch (error) {
            console.error('Error consuming enquiry:', error);
            return false;
        }
    }

    /**
     * Send notification to vendor about wallet deduction
     */
    async notifyVendorOfWalletDeduction(vendorId, amount) {
        try {
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) return;

            // Send email
            if (vendor.email) {
                await emailService.sendEmail({
                    to: vendor.email,
                    subject: 'Wallet Deduction: Enquiry Unlock',
                    text: `Dear ${vendor.businessName || 'Vendor'},\n\nYour wallet has been charged ₹${amount} for a new enquiry unlock, as your subscription quota was exhausted.\n\nYou can view your transaction history in your vendor dashboard.\n\nThank you for using Dealing India.`
                });
            }
            
            // Note: FCM or in-app notification could be added here
        } catch (error) {
            console.error('Notify vendor error:', error);
        }
    }

    /**
     * Get vendor's enquiry availability status for public display
     * @param {String} vendorId 
     * @returns {Promise<Object>} Status object
     */
    async getVendorEnquiryStatus(vendorId, providedSettings = null) {
        try {
            const subData = await this.getActiveSubscription(vendorId);
            
            // Default status if no plan
            const b2bSettings = providedSettings || await B2BSettings.findOne().sort({ createdAt: -1 }).lean();
            const defaultPrice = b2bSettings?.defaultEnquiryPrice ?? 1;
            
            let canAcceptEnquiries = false;
            let currentPrice = defaultPrice; // Use global default
            let reason = 'QUOTA_EXHAUSTED';
            let message = 'Subscription plan enquiry quota has been reached.';

            if (subData && subData.plan) {
                const plan = subData.plan;
                const subLimit = plan.enquiryLimit === 'unlimited' ? -1 : (Number(plan.enquiryLimit) || 0);
                
                // 1. Check if Plan has quota
                const subDoc = await VendorSubscription.findById(subData.subscription._id);
                if (subDoc) {
                    const used = subDoc.usage?.enquiriesUsed || 0;
                    if (subLimit === -1 || used < subLimit) {
                        return { canAcceptEnquiries: true, type: 'plan' };
                    }
                }

                if (plan.enquiryPrice > 0) currentPrice = plan.enquiryPrice;
            } else {
                reason = 'NO_PLAN';
                message = 'No active subscription plan found. Wallet balance will be used.';
            }

            // 2. Check if Addons have quota
            const addonUnits = await vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'enquiry');
            if (addonUnits > 0) {
                return { canAcceptEnquiries: true, type: 'addon' };
            }

            // 3. Check Wallet Balance (at least DEFAULT_PRICE or plan.enquiryPrice)
            const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
            if (wallet.balance >= currentPrice) {
                return { canAcceptEnquiries: true, type: 'wallet', price: currentPrice };
            }

            return { 
                canAcceptEnquiries: false, 
                reason: wallet.balance < currentPrice ? 'INSUFFICIENT_BALANCE' : reason,
                message: wallet.balance < currentPrice ? 'Quota exhausted and insufficient wallet balance.' : message 
            };
        } catch (error) {
            console.error('Error getting vendor enquiry status:', error);
            return { canAcceptEnquiries: false, reason: 'ERROR' };
        }
    }
}

export default new SubscriptionRulesService();
