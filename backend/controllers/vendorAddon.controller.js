import vendorAddonService from '../services/vendorAddon.service.js';
import b2bAddonPlanService from '../services/b2bAddonPlan.service.js';
import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import BusinessType from '../models/BusinessType.model.js';

class VendorAddonController {
  /**
   * Get all active addon packages available for this specific vendor
   * Considers vendor role (e.g. textile, developer, property-broker)
   * GET /vendor/addons/available
   */
  async getAvailableAddons(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      if (!vendorId) return res.status(401).json({ success: false, message: 'Vendor ID not found' });

      // Identify vendor role for filtering
      const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

      let businessTypeId = vendor.businessTypeRef;
      
      // If ref is missing, try to find by name/slug/ID
      if (!businessTypeId && vendor.businessType) {
        if (/^[0-9a-fA-F]{24}$/.test(vendor.businessType)) {
          businessTypeId = vendor.businessType;
        } else {
          const bt = await BusinessType.findOne({ 
            $or: [{ name: vendor.businessType }, { slug: vendor.businessType.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') }] 
          });
          if (bt) businessTypeId = bt._id;
        }
      }

      // Note: We don't return early if businessTypeId is missing. 
      // Instead, we skip settings-specific addons and hit the fallback below.
      
      const settings = businessTypeId ? await BusinessTypeSettings.findOne({ businessTypeId }) : null;
      
      let availableAddons = [];
      if (settings && settings.allowedAddonPlans && settings.allowedAddonPlans.length > 0) {
        availableAddons = await b2bAddonPlanService.getAllPlans({ _id: { $in: settings.allowedAddonPlans }, isActive: true });
      } else {
        // Fallback: If no specific addons are configured, show all active B2B addon plans
        availableAddons = await b2bAddonPlanService.getAllPlans({ isActive: true });
      }

      let filteredAddons = availableAddons;
      const { featureType } = req.query;

      if (featureType) {
        filteredAddons = availableAddons.filter(a => a.featureType === featureType);
      }

      res.status(200).json({
        success: true,
        data: filteredAddons,
        message: 'Available addon packages fetched successfully'
      });
    } catch (error) {
      console.error('Error in getAvailableAddons controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon package plans'
      });
    }
  }

  /**
   * Purchase addon using wallet balance
   * POST /vendor/addons/purchase-wallet
   */
  async purchaseAddonViaWallet(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      // Enforce quantity = 1 as per requirements (exact plan only)
      const addonPlanId = req.body.addonPlanId;
      const quantity = 1;

      if (!addonPlanId) {
        return res.status(400).json({ success: false, message: 'Addon plan ID is required' });
      }

      const addonRecord = await vendorAddonService.purchaseAddonViaWallet(vendorId, addonPlanId, quantity);

      res.status(200).json({
        success: true,
        data: addonRecord,
        message: 'Addon purchased successfully using wallet balance'
      });
    } catch (error) {
      console.error('Error in purchaseAddonViaWallet controller:', error);
      res.status(error.message?.includes('Insufficient wallet balance') ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to purchase addon using wallet'
      });
    }
  }

  /**
   * Initialize addon purchase (Create Razorpay Order)
   * POST /vendor/addons/initialize
   */
  async initializeAddonPurchase(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      // Enforce quantity = 1 as per requirements (exact plan only)
      const addonPlanId = req.body.addonPlanId;
      const quantity = 1;

      if (!addonPlanId) {
        return res.status(400).json({ success: false, message: 'Addon plan ID is required' });
      }

      const orderData = await vendorAddonService.initializeAddonPurchase(vendorId, addonPlanId, quantity);

      console.log('Finalizing Addon Purchase Initialization:', {
        orderId: orderData.id,
        amount: orderData.amount,
        hasKey: !!process.env.RAZORPAY_KEY_ID
      });
 
      res.status(200).json({
        success: true,
        data: {
          order: orderData,
          key: process.env.RAZORPAY_KEY_ID
        },
        message: 'Addon purchase initialized'
      });
    } catch (error) {
      console.error('Error in initializeAddonPurchase controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize addon purchase'
      });
    }
  }

  /**
   * Verify addon payment and credit units
   * POST /vendor/addons/verify
   */
  async verifyAddonPayment(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const paymentData = req.body;

      if (!paymentData.razorpayOrderId || !paymentData.razorpayPaymentId || !paymentData.razorpaySignature) {
        return res.status(400).json({ success: false, message: 'All payment verification details required' });
      }

      const addonRecord = await vendorAddonService.verifyAddonPayment(vendorId, paymentData);

      res.status(200).json({
        success: true,
        data: addonRecord,
        message: 'Addon units credited to your account successfully'
      });
    } catch (error) {
      console.error('Error in verifyAddonPayment controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify addon payment'
      });
    }
  }
 
  /**
   * Get recent addon purchase history
   * GET /vendor/addons/history
   */
  async getRecentAddons(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const history = await vendorAddonService.getRecentAddons(vendorId);
      res.status(200).json({
        success: true,
        data: history,
        message: 'Addon history fetched successfully'
      });
    } catch (error) {
      console.error('Error in getRecentAddons controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon history'
      });
    }
  }

  /**
   * Get vendor's current addon status/limits
   * GET /vendor/addons/status
   */
  async getMyAddonsStatus(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;

      const [reelsQuota, productsQuota, lotSlotQuota, propertyQuota, enquiryQuota] = await Promise.all([
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'reels'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'products'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'lot_slot'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'property'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'enquiry'),
      ]);

      res.status(200).json({
        success: true,
        data: [
          { _id: 'reels', totalAvailable: reelsQuota || 0 },
          { _id: 'products', totalAvailable: productsQuota || 0 },
          { _id: 'lot_slot', totalAvailable: lotSlotQuota || 0 },
          { _id: 'property', totalAvailable: propertyQuota || 0 },
          { _id: 'enquiry', totalAvailable: enquiryQuota || 0 }
        ],
        message: 'Addon quotas fetched successfully'
      });
    } catch (error) {
      console.error('Error in getMyAddonsStatus controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon quotas'
      });
    }
  }
}

export default new VendorAddonController();
