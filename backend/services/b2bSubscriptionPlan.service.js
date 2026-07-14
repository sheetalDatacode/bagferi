import mongoose from 'mongoose';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import razorpayService from './razorpay.service.js';

class B2BSubscriptionPlanService {
  /**
   * Get all B2B subscription plans
   * @param {Object} options - Query options
   * @param {Boolean} options.includeInactive - Include inactive plans
   * @returns {Promise<Array>} Array of plans
   */
  async getAllPlans(options = {}) {
    try {
      const { includeInactive = false, businessType = null } = options;
      const query = {};

      if (!includeInactive) {
        query.isActive = true;
      }

      if (businessType || options.vendorId) {
        let businessTypeId = null;

        if (businessType) {
          // If businessType is a valid ObjectId string, use it directly
          if (mongoose.Types.ObjectId.isValid(businessType)) {
            businessTypeId = businessType;
          } else {
            // Otherwise treat as slug
            const bType = await BusinessType.findOne({ slug: businessType.toLowerCase().trim() });
            if (bType) businessTypeId = bType._id;
          }
        } else if (options.vendorId) {
          // Fallback: Get business type from vendor if vendorId is provided
          const Vendor = (await import('../models/Vendor.model.js')).default;
          const vendor = await Vendor.findById(options.vendorId).select('businessTypeRef').lean();
          if (vendor && vendor.businessTypeRef) {
            businessTypeId = vendor.businessTypeRef;
          }
        }

        if (businessTypeId) {
          const settings = await BusinessTypeSettings.findOne({ businessTypeId }).lean();

          // If settings exist, strictly filter by allowedPlans
          if (settings) {
            const allowedPlans = Array.isArray(settings.allowedPlans) ? settings.allowedPlans : [];

            // Filter out any empty/null/undefined plans and convert to ObjectIds if possible
            const validAllowedPlans = allowedPlans
              .filter(pid => pid && pid.toString().trim() !== '')
              .map(pid => {
                 try {
                    return mongoose.Types.ObjectId.isValid(pid.toString().trim()) 
                        ? new mongoose.Types.ObjectId(pid.toString().trim()) 
                        : null;
                 } catch (e) { return null; }
              })
              .filter(pid => pid !== null);

            // Apply filter - if allowedPlans was [], validAllowedPlans is [], and query._id is { $in: [] } (returns 0)
            query._id = { $in: validAllowedPlans };
          } else {
            // If no settings found for a valid business type, we should probably return NO plans
            // to be safe and encourage configuration
            query._id = { $in: [] }; 
          }
        } else if (businessType) {
           // businessType slug was provided but not found - return nothing instead of everything
           query._id = { $in: [] };
        }
      }

      const plans = await B2BSubscriptionPlan.find(query)
        .sort({ duration: 1 }) // Sort by duration: 3, 6, 12
        .select('-__v')
        .lean();

      return plans;
    } catch (error) {
      throw new Error(`Failed to fetch B2B subscription plans: ${error.message}`);
    }
  }

  /**
   * Get active B2B subscription plans only
   * @returns {Promise<Array>} Array of active plans
   */
  async getActivePlans() {
    return this.getAllPlans({ includeInactive: false });
  }

  /**
   * Get plan by ID
   * @param {String} planId - Plan ID
   * @returns {Promise<Object|null>} Plan object or null
   */
  async getPlanById(planId) {
    try {
      const plan = await B2BSubscriptionPlan.findById(planId)
        .select('-__v')
        .lean();

      if (!plan) {
        throw new Error('B2B subscription plan not found');
      }

      return plan;
    } catch (error) {
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
  }

  /**
   * Get plan by duration
   * @param {Number} duration - Duration in months (3, 6, or 12)
   * @returns {Promise<Object|null>} Plan object or null
   */
  async getPlanByDuration(duration) {
    try {
      const plan = await B2BSubscriptionPlan.findOne({ duration, isActive: true })
        .select('-__v')
        .lean();

      return plan;
    } catch (error) {
      throw new Error(`Failed to fetch plan by duration: ${error.message}`);
    }
  }

  /**
   * Create a new B2B subscription plan
   * @param {Object} planData - Plan data
   * @param {String} planData.name - Plan name
   * @param {Number} planData.duration - Duration in months (3, 6, or 12)
   * @param {Number} planData.price - Plan price
   * @param {Array<String>} planData.features - Array of features
   * @param {String} createdBy - Admin ID who created the plan
   * @returns {Promise<Object>} Created plan
   */
  async createPlan(planData, createdBy) {
    try {
      const { name, duration, price, features = [], description } = planData;

      // Validate duration - must be 3, 6, or 12 months
      if (![3, 6, 12].includes(Number(duration))) {
        throw new Error('Duration must be 3, 6, or 12 months');
      }

      const planPrice = parseFloat(price) || 0;
      const discountAmount = parseFloat(planData.discount) || 0;
      const gstPercentage = parseFloat(planData.gst) || 18;
      
      const priceAfterDiscount = Math.max(0, planPrice - discountAmount);
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const planName = name.trim();
      let razorpayPlanId = null;

      // 🔹 Create in Razorpay if it's a paid plan
      if (totalAmount > 0) {
        try {
          // Determine period and interval for Razorpay
          let razorPeriod = 'monthly';
          let razorInterval = duration;
          
          if (duration === 12) {
            razorPeriod = 'yearly';
            razorInterval = 1;
          }

          const razorpayPlan = await razorpayService.createPlan({
            name: planName,
            amount: totalAmount,
            currency: 'INR',
            period: razorPeriod,
            interval: razorInterval,
            description: description?.trim() || `${duration} months subscription for ${planName} (Inc. GST)`,
          });
          razorpayPlanId = razorpayPlan.id;
        } catch (err) {
          console.error('Initial Razorpay plan creation failed:', err);
        }
      }

      const planToCreate = {
        name: planName,
        duration,
        price: planPrice,
        discount: discountAmount,
        gst: gstPercentage,
        features: features.filter(f => f && f.trim()),
        description: description?.trim(),
        reelsLimit: planData.reelsLimit || 0,
        productLimit: planData.productLimit || 0,
        propertyLimit: planData.propertyLimit || 0,
        lotSlotLimit: planData.lotSlotLimit || 0,
        imagesPerListing: planData.imagesPerListing || 5,
        enquiryLimit: planData.enquiryLimit || 0,
        jobLimit: planData.jobLimit || 0,
        enquiryPrice: planData.enquiryPrice || 0,
        shopSlideshow: !!planData.shopSlideshow,
        isActive: true,
        razorpayPlanId
      };

      if (createdBy) {
        planToCreate.createdBy = createdBy;
        planToCreate.updatedBy = createdBy;
      }

      const plan = await B2BSubscriptionPlan.create(planToCreate);

      return plan.toObject();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(`A plan with ${planData.duration} months duration already exists`);
      }
      throw new Error(`Failed to create plan: ${error.message}`);
    }
  }

  /**
   * Update an existing B2B subscription plan
   * @param {String} planId - Plan ID
   * @param {Object} updateData - Data to update
   * @param {String} updatedBy - Admin ID who updated the plan
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updateData, updatedBy) {
    try {
      const { name, price, features, description, isActive, duration } = updateData;

      const plan = await B2BSubscriptionPlan.findById(planId);
      if (!plan) {
        throw new Error('B2B subscription plan not found');
      }
 
      // 🔹 Validate structured numeric features if provided
      const structuredNumericFields = ['reelsLimit', 'productLimit', 'propertyLimit', 'lotSlotLimit', 'imagesPerListing', 'enquiryLimit', 'jobLimit'];
      for (const field of structuredNumericFields) {
        if (updateData[field] !== undefined && updateData[field] !== 'unlimited') {
          const val = Number(updateData[field]);
          if (isNaN(val) || val < 0) {
            throw new Error(`Invalid value for ${field}: must be a non-negative number or 'unlimited'`);
          }
          updateData[field] = val; // Normalize to number if numeric
        }
      }

      // Validate duration if provided - must be 3, 6, or 12 months
      if (duration !== undefined && ![3, 6, 12].includes(Number(duration))) {
        throw new Error('Duration must be 3, 6, or 12 months');
      }

      // 🔹 Detect critical changes
      const isPriceChanged =
        price !== undefined && parseFloat(price) !== plan.price;

      const isDiscountChanged =
        updateData.discount !== undefined && parseFloat(updateData.discount) !== (plan.discount || 0);

      const isGstChanged =
        updateData.gst !== undefined && parseFloat(updateData.gst) !== (plan.gst || 18);

      const isNameChanged =
        name !== undefined && name.trim() !== plan.name;

      const finalBasePrice = price !== undefined ? parseFloat(price) : plan.price;
      const finalDiscount = updateData.discount !== undefined ? parseFloat(updateData.discount) : (plan.discount || 0);
      const finalGst = updateData.gst !== undefined ? parseFloat(updateData.gst) : (plan.gst || 18);

      const priceAfterDiscount = Math.max(0, finalBasePrice - finalDiscount);
      const gstAmount = Math.round(priceAfterDiscount * (finalGst / 100));
      const finalTotalAmount = priceAfterDiscount + gstAmount;

      const isTotalAmountChanged =
        isPriceChanged || isDiscountChanged || isGstChanged;

      /**
       * 🔹 Rule:
       * - price, discount, gst OR name change ho
       * - AUR, ya phir agar plan paid hai magar koi Razorpay Plan ID nahi hai (!plan.razorpayPlanId)
       * - aur final plan paid ho (> 0)
       * → naya Razorpay plan create karo
       */
      if (
        (isTotalAmountChanged || isNameChanged || !plan.razorpayPlanId) &&
        finalTotalAmount > 0
      ) {
        const planName = name?.trim() || plan.name;
        const planDuration = duration !== undefined ? Number(duration) : plan.duration;
        const planDescription =
          description?.trim() ||
          plan.description ||
          `${planDuration} months subscription for ${planName} (Inc. GST)`;

        try {
          // Determine period and interval for Razorpay
          let razorPeriod = 'monthly';
          let razorInterval = planDuration;
          
          if (planDuration === 12) {
            razorPeriod = 'yearly';
            razorInterval = 1;
          }

          const razorpayPlan = await razorpayService.createPlan({
            name: planName,
            amount: finalTotalAmount,
            currency: 'INR',
            period: razorPeriod,
            interval: razorInterval,
            description: planDescription,
          });

          updateData.razorpayPlanId = razorpayPlan.id;
        } catch (err) {
          console.error('Razorpay plan creation failed:', err);
          throw new Error(`Could not create Razorpay plan: ${err.message}`);
        }
      }

      // 🔹 Free plan case
      if (finalTotalAmount === 0) {
        updateData.razorpayPlanId = null;
      }

      // 🔹 Update DB fields
      if (name !== undefined) plan.name = name.trim();
      if (price !== undefined) plan.price = parseFloat(price);
      if (updateData.discount !== undefined) plan.discount = parseFloat(updateData.discount);
      if (updateData.gst !== undefined) plan.gst = parseFloat(updateData.gst);
      if (duration !== undefined) plan.duration = duration;

      if (features !== undefined) {
        plan.features = features.filter(f => f?.trim());
      }

      if (description !== undefined) {
        plan.description = description.trim();
      }

      if (isActive !== undefined) plan.isActive = isActive;
      if (updatedBy) plan.updatedBy = updatedBy;

      if (updateData.razorpayPlanId !== undefined) {
        plan.razorpayPlanId = updateData.razorpayPlanId;
      }
 
      // 🔹 Update Structured Features
      if (updateData.reelsLimit !== undefined) {
        plan.reelsLimit = updateData.reelsLimit;
        plan.markModified('reelsLimit');
      }
      if (updateData.productLimit !== undefined) {
        plan.productLimit = updateData.productLimit;
        plan.markModified('productLimit');
      }
      if (updateData.propertyLimit !== undefined) {
        plan.propertyLimit = updateData.propertyLimit;
        plan.markModified('propertyLimit');
      }
      if (updateData.lotSlotLimit !== undefined) {
        plan.lotSlotLimit = updateData.lotSlotLimit;
        plan.markModified('lotSlotLimit');
      }
      if (updateData.imagesPerListing !== undefined) {
        plan.imagesPerListing = updateData.imagesPerListing;
        plan.markModified('imagesPerListing');
      }
      if (updateData.enquiryLimit !== undefined) {
        plan.enquiryLimit = updateData.enquiryLimit;
        plan.markModified('enquiryLimit');
      }
      if (updateData.jobLimit !== undefined) {
        plan.jobLimit = updateData.jobLimit;
        plan.markModified('jobLimit');
      }
      if (updateData.enquiryPrice !== undefined) {
        plan.enquiryPrice = parseFloat(updateData.enquiryPrice) || 0;
      }
      if (updateData.shopSlideshow !== undefined) plan.shopSlideshow = !!updateData.shopSlideshow;

      await plan.save();
      return plan.toObject();

    } catch (error) {
      throw new Error(`Failed to update plan: ${error.message}`);
    }
  }


  /**
   * Delete a plan (soft delete by setting isActive to false)
   * @param {String} planId - Plan ID
   * @param {String} updatedBy - Admin ID who deleted the plan
   * @returns {Promise<Object>} Deleted plan
   */
  async deletePlan(planId, updatedBy) {
    try {
      const plan = await this.updatePlan(planId, { isActive: false }, updatedBy);
      return plan;
    } catch (error) {
      throw new Error(`Failed to delete plan: ${error.message}`);
    }
  }

  /**
   * Ensure default plan exists (12 months only)
   * @param {String} createdBy - Admin ID
   * @returns {Promise<Array>} Array of all plans
   */
  async ensureDefaultPlans(createdBy) {
    try {
      const defaultPlans = [
        {
          name: 'Yearly Plan',
          duration: 12,
          price: 9999, // User requested yearly, setting a default price if needed
          features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management',
            'Personal Account Manager'
          ],
          enquiryLimit: 100,
          productLimit: 'unlimited',
          reelsLimit: 'unlimited',
          propertyLimit: 'unlimited',
        },
      ];

      const existingPlans = await this.getAllPlans({ includeInactive: true });
      const existingDurations = existingPlans.map(p => p.duration);

      for (const defaultPlan of defaultPlans) {
        // Only if no yearly plan exists
        if (!existingDurations.includes(12)) {
          await this.createPlan(defaultPlan, createdBy);
        }
      }

      // No longer auto-deactivating non-12-month plans as they are now officially supported
/*
      await B2BSubscriptionPlan.updateMany(
        { duration: { $ne: 12 } },
        { isActive: false }
      );
*/

      return this.getAllPlans({ includeInactive: false });
    } catch (error) {
      throw new Error(`Failed to ensure default plans: ${error.message}`);
    }
  }
}

export default new B2BSubscriptionPlanService();
