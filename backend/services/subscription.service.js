import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';

import razorpayService from './razorpay.service.js';
import NotificationService from './notification.service.js';
import zohoBooksService from './zohoBooks.service.js';
import { sendPaymentSuccessEmail, sendPaymentCancelledEmail } from './email.service.js';
import mongoose from 'mongoose';


class SubscriptionService {
  async getAllPlans(includeInactive = false) {
    try {
      const query = includeInactive ? {} : { isActive: true };
      const plans = await B2BSubscriptionPlan.find(query).sort({ price: 1 }).lean();
      return plans;
    } catch (error) {
      console.error('Error getting all plans:', error);
      throw error;
    }
  }

  async getVendorSubscription(vendorId) {
    try {
      const vendorObjectId = typeof vendorId === 'string'
        ? new mongoose.Types.ObjectId(vendorId)
        : vendorId;

      const VendorModel = (await import('../models/Vendor.model.js')).default;
      const vendor = await VendorModel.findById(vendorObjectId).select('currentSubscription').lean();

      let subscription = null;

      if (vendor?.currentSubscription) {
        subscription = await VendorSubscription.findById(vendor.currentSubscription)
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .lean();

        if (subscription && subscription.planId) {
          return subscription;
        }
      }

      if (!subscription || !subscription.planId) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId,
          status: 'active'
        })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (!subscription) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId
        })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (subscription && subscription.planId) {
        return subscription;
      }

      return null;
    } catch (error) {
      console.error('Error in getVendorSubscription:', error);
      return null;
    }
  }

  async initializeSubscription(vendorId, planId, io = null) {
    try {
      const plan = await B2BSubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Subscription plan not found');

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      const planPrice = plan.price;
      const planName = plan.name;

      if (planPrice === 0) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

          const subscriptionData = {
            vendorId,
            planId,
            billingCycle: 'yearly',
            startDate,
            endDate,
            paymentMethod: 'free',
            status: 'active',
            lastPaymentDate: startDate,
            nextBillingDate: endDate,
            usage: {
              lastResetDate: startDate
            }
          };

          const subscription = await VendorSubscription.create([subscriptionData], { session });

          await Vendor.findByIdAndUpdate(vendorId, {
            currentSubscription: subscription[0]._id
          }, { session });

          await session.commitTransaction();

          // Notify admins about free subscription
          try {
            await NotificationService.sendBulkNotification({
              type: 'payment_success',
              title: 'Vendor Subscription Purchase',
              message: 'Vendor has purchased a subscription plan.',
              actionUrl: `/admin/b2b-vendors/subscriptions`,
              metadata: {
                vendorId: vendorId.toString(),
                vendorName: vendor?.businessName || vendor?.storeName || 'A vendor',
                planName: planName,
                amount: 0,
                type: 'free_subscription'
              }
            }, 'admins');
          } catch (notifError) {
            console.error('Failed to notify admins about free subscription:', notifError);
          }

          return {
            subscription: subscription[0],
            razorpay: null,
            razorpayKeyId: null
          };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const basePrice = plan.price || 0;
      const discount = plan.discount || 0;
      const priceAfterDiscount = Math.max(0, basePrice - discount);

      // Use the plan's specific GST rate or default to 18%
      const gstPercentage = plan.gst || 18;
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const subscriptionCode = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const pendingSubscriptionData = {
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'pending',
        basePrice: basePrice,
        discount: discount,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        usage: {
          lastResetDate: startDate
        }
      };

      const subscription = await VendorSubscription.create(pendingSubscriptionData);

      let razorpayOrder = await razorpayService.createOrder(
        totalAmount,
        'INR',
        subscriptionCode,
        {
          vendorId: vendorId.toString(),
          planId: planId.toString(),
          subscriptionId: subscription._id.toString(),
          planName: planName,
          basePrice: basePrice.toString(),
          discount: discount.toString(),
          gstAmount: gstAmount.toString(),
          totalAmount: totalAmount.toString(),
          type: 'subscription',
          isB2B: 'true'
        }
      );

      return {
        subscription,
        razorpay: razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
        vendorId: vendorId.toString(),
        planId: planId.toString(),
        isB2B: true
      };
    } catch (error) {
      console.error('Initialize Subscription Error:', error);
      throw error;
    }
  }

  /**
   * Purchase subscription or upgrade via wallet
   * @param {String} vendorId - Vendor ID
   * @param {String} planId - Subscription Plan ID
   * @returns {Promise<Object>} VendorSubscription record
   */
  async purchaseSubscriptionViaWallet(vendorId, planId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) throw new Error('Vendor not found');

      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Subscription plan not found');

      const basePrice = plan.price || 0;
      const discount = plan.discount || 0;
      const priceAfterDiscount = Math.max(0, basePrice - discount);

      // For wallet purchases, we do NOT add GST because it was already collected during recharge top-up
      const gstAmount = 0;
      const totalAmount = priceAfterDiscount;

      // Pay via wallet - this will check balance and debit
      const { default: vendorWalletService } = await import('./vendorWallet.service.js');
      await vendorWalletService.payViaWallet(
        vendorId,
        totalAmount,
        `Purchase Subscription Plan: ${plan.name}`,
        planId.toString(),
        'subscription_plan'
      );

      // Create Active Subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const [subscription] = await VendorSubscription.create([{
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'wallet',
        status: 'active',
        lastPaymentDate: new Date(),
        nextBillingDate: endDate,
        basePrice: basePrice,
        discount: discount,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        usage: { lastResetDate: startDate }
      }], { session });

      // Update Vendor currentSubscription
      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription._id
      }, { session });

      await session.commitTransaction();

      // Trigger Email integration helper (Async - skipping Zoho as per wallet pattern)
      this.sendWalletSubscriptionNotification(subscription._id).catch(err => {
        console.error('[SubWallet][Email] Background email failed:', err);
      });

      return await VendorSubscription.findById(subscription._id).populate('planId').populate('vendorId').lean();
    } catch (error) {
      await session.abortTransaction();
      console.error('Purchase Subscription Via Wallet Error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Send email notification for wallet-based subscription purchase
   */
  async sendWalletSubscriptionNotification(subscriptionId) {
    try {
      const subscription = await VendorSubscription.findById(subscriptionId)
        .populate('vendorId')
        .populate('planId');

      if (!subscription || !subscription.vendorId) return;

      await sendPaymentSuccessEmail({
        to: subscription.vendorId.email,
        amount: subscription.totalAmount,
        planName: subscription.planId.name,
        title: subscription.planId.name,
        paymentFor: 'subscription',
        paymentDate: new Date(),
        transactionId: subscription.paymentId || 'WALLET-TRANS',
        referenceId: `SUB-${subscription._id}`,
        paymentMethod: 'Wallet Balance',
        vendor: { 
          name: subscription.vendorId.storeName || subscription.vendorId.name,
          email: subscription.vendorId.email,
          phone: subscription.vendorId.phone 
        }
      });
    } catch (error) {
      console.error('Error sending wallet subscription notification:', error);
    }
  }

  async verifySubscriptionPayment(vendorId, planId, paymentData, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      const vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) throw new Error('Vendor not found');

      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Subscription plan not found');

      const basePrice = plan.price || 0;
      const discount = plan.discount || 0;
      const priceAfterDiscount = Math.max(0, basePrice - discount);

      const gstPercentage = plan.gst || 18;
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Payment verification failed');

      let paymentDetails = await razorpayService.getPaymentDetails(razorpayPaymentId);
      const paymentStatus = paymentDetails.status;

      if (paymentStatus !== 'captured' && paymentStatus !== 'authorized' && paymentStatus !== 'created') {
        // Handle failure structurally
        const [failedSub] = await VendorSubscription.create([{
          vendorId,
          planId,
          billingCycle: 'yearly',
          startDate: new Date(),
          endDate: new Date(),
          paymentMethod: 'razorpay',
          status: 'failed',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          auditLogs: [{
            action: 'subscription_payment',
            timestamp: new Date(),
            details: { 
              amount: basePrice, 
              status: 'failed', 
              planName: plan.name, 
              failureReason: `Status: ${paymentStatus}` 
            }
          }]
        }], { session });

        await session.commitTransaction();

        // Background cancellation email
        (async () => {
          try {
            await sendPaymentCancelledEmail({
              to: vendor.email,
              amount: basePrice,
              planName: plan.name,
              title: plan.name,
              paymentFor: 'subscription',
              paymentDate: new Date(),
              transactionId: razorpayPaymentId,
              referenceId: `SUB-${planId}-${razorpayOrderId}`,
              paymentMethod: 'razorpay',
              vendor: { name: vendor.businessName || vendor.storeName || 'Vendor', email: vendor.email, phone: vendor.phone }
            });
          } catch (e) {
            console.error('Failed to send cancellation email:', e.message);
          }
        })();

        throw new Error('Payment not successful. Status: ' + paymentStatus);
      }

      // Success Path
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const activeSubscriptionData = {
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'active',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: new Date(),
        nextBillingDate: endDate,
        basePrice: basePrice,
        discount: discount,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        usage: { lastResetDate: startDate }
      };

      const subscription = await VendorSubscription.create([activeSubscriptionData], { session });

      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription[0]._id
      }, { session });

      if (basePrice > 0) {
        subscription[0].auditLogs.push({
          action: 'subscription_payment',
          timestamp: new Date(),
          details: { 
            amount: basePrice, 
            status: 'completed', 
            razorpayOrderId, 
            razorpayPaymentId, 
            planName: plan.name, 
            paymentDate: new Date() 
          }
        });
        await subscription[0].save({ session });
      }

      // Admin notification
      try {
        const Admin = (await import('../models/Admin.model.js')).default;
        const admins = await Admin.find({ isActive: true }).select('_id');
        const notifications = admins.map(admin => ({
          recipientType: 'admin',
          recipientId: admin._id,
          type: 'payment_success',
          title: 'Vendor Subscription Purchase',
          message: 'Vendor has purchased a subscription plan.',
          metadata: { 
            subscriptionId: subscription[0]._id, 
            vendorId, 
            planName: plan.name, 
            amount: basePrice, 
            type: 'subscription' 
          },
          actionUrl: `/admin/subscriptions/${subscription[0]._id}`
        }));
        await NotificationService.createBulkNotifications(notifications, io);
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
      }

      await session.commitTransaction();

      // Trigger Zoho + Email integration helper (Async)
      this.processZohoAndEmailForSubscription(subscription[0]._id).catch(err => {
        console.error('[SubPay][Centralized] background integration error:', err);
      });

      return await VendorSubscription.findById(subscription[0]._id).populate('planId').populate('vendorId').lean();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async subscribeVendor(vendorId, planId, billingCycle, paymentMethod) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Plan not found');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const subscription = await VendorSubscription.create([{
        vendorId,
        planId,
        billingCycle: billingCycle || 'yearly',
        startDate,
        endDate,
        paymentMethod,
        status: 'active',
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        usage: { lastResetDate: startDate }
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: subscription[0]._id }, { session });
      await session.commitTransaction();
      return subscription[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async upgradeSubscription(vendorId, newPlanId, billingCycle = 'monthly') {
    const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('planId');
    if (!currentSub) throw new Error('No active subscription found');
    const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
    if (!newPlan) throw new Error('New plan not found');

    const now = new Date();
    const remainingTime = currentSub.endDate - now;
    const totalTime = currentSub.endDate - currentSub.startDate;
    const remainingRatio = Math.max(0, remainingTime / totalTime);
    const unusedAmount = (currentSub.planId?.price || 0) * remainingRatio;
    const chargeAmount = Math.max(0, newPlan.price - unusedAmount);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      currentSub.status = 'expired';
      currentSub.cancellationDate = now;
      await currentSub.save({ session });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (newPlan.duration || 12));

      const [newSub] = await VendorSubscription.create([{
        vendorId,
        planId: newPlanId,
        billingCycle: billingCycle || 'yearly',
        startDate: now,
        endDate,
        status: 'active',
        paymentMethod: currentSub.paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate,
        usage: { lastResetDate: now },
        auditLogs: [{
          action: 'upgrade',
          timestamp: new Date(),
          details: { fromPlan: currentSub.planId?.name || 'Unknown', toPlan: newPlan.name, proratedCharge: chargeAmount }
        }]
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: newSub._id }, { session });

      if (chargeAmount > 0) {
        newSub.auditLogs.push({
          action: 'upgrade_payment',
          timestamp: new Date(),
          details: { amount: chargeAmount, status: 'completed', type: 'upgrade_proration', planName: newPlan.name, paymentDate: new Date() }
        });
        await newSub.save({ session });
      }

      await session.commitTransaction();
      return newSub;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculates upgrade proration breakdown.
   * Uses the exact formula:
   *   usedDays   = floor((now - startDate) / ms_per_day)
   *   remaining  = max(totalDays - usedDays, 0)
   *   credit     = (oldPlanPrice / totalDays) * remaining
   *   netBase    = max(newPlanPrice - credit, 0)   ← GST applied here
   */
  _calcUpgradeBreakdown(currentSub, newPlan) {
    const now = new Date();
    const startDate = new Date(currentSub.startDate);
    const endDate = new Date(currentSub.endDate);

    const totalDays = Math.max(
      1,
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    );
    const usedDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(totalDays - usedDays, 0);

    const oldPlanPrice = currentSub.planId?.price || 0;
    const newPlanPrice = newPlan.price || 0;
    const perDayCost = oldPlanPrice / totalDays;
    const unusedCredit = Math.round(perDayCost * remainingDays);
    const netBase = Math.max(newPlanPrice - unusedCredit, 0); // GST applies to this

    const gstPercentage = newPlan.gst || 18;
    const gstAmount = Math.round(netBase * (gstPercentage / 100));
    const finalAmount = Math.round(netBase + gstAmount);

    return {
      oldPlanPrice,
      newPlanPrice,
      totalDays,
      usedDays,
      remainingDays,
      perDayCost,
      unusedCredit,
      netBase,       // base amount after credit
      gstPercentage,
      gstAmount,
      finalAmount,   // total to charge via Razorpay
    };
  }

  async initializeB2BUpgrade(vendorId, newPlanId) {
    try {
      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' })
        .populate('planId');
      if (!currentSub) throw new Error('No active subscription found to upgrade');

      const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
      if (!newPlan) throw new Error('New plan not found');

      const getRank = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('gold')) return 5;
        if (n.includes('premium')) return 4;
        if (n.includes('diamond')) return 3;
        if (n.includes('silver')) return 2;
        if (n.includes('basic')) return 1;
        return 0;
      };
      if (getRank(newPlan.name) <= getRank(currentSub.planId?.name)) {
        throw new Error('Downgrade not allowed. You can change plan after expiry.');
      }

      const b = this._calcUpgradeBreakdown(currentSub, newPlan);

      const upgradeCode = `UPG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const razorpayOrder = await razorpayService.createOrder(
        b.finalAmount,
        'INR',
        upgradeCode,
        {
          vendorId: vendorId.toString(),
          newPlanId: newPlanId.toString(),
          currentSubId: currentSub._id.toString(),
          oldPlanPrice: b.oldPlanPrice.toString(),
          newPlanPrice: b.newPlanPrice.toString(),
          unusedCredit: b.unusedCredit.toString(),
          netBase: b.netBase.toString(),
          gstAmount: b.gstAmount.toString(),
          totalAmount: b.finalAmount.toString(),
          usedDays: b.usedDays.toString(),
          remainingDays: b.remainingDays.toString(),
          type: 'subscription_upgrade',
          isB2B: 'true'
        }
      );

      return {
        success: true,
        currentPlan: currentSub.planId?.name,
        newPlan: newPlan.name,
        // Proration breakdown for UI display
        oldPlanPrice: b.oldPlanPrice,
        newPlanPrice: b.newPlanPrice,
        usedDays: b.usedDays,
        remainingDays: b.remainingDays,
        unusedCredit: b.unusedCredit,  // credit deducted from new plan price
        netBase: b.netBase,            // new plan price after credit
        gstAmount: b.gstAmount,        // GST on netBase only
        finalAmount: b.finalAmount,    // Razorpay charges this
        razorpay: razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Initialize B2B Upgrade Error:', error);
      throw error;
    }
  }

  async verifyB2BUpgradePayment(vendorId, newPlanId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Payment verification failed');

      // MUST populate planId to get price for credit calculation
      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' })
        .populate('planId')
        .session(session);
      const newPlan = await B2BSubscriptionPlan.findById(newPlanId).session(session);
      if (!newPlan) throw new Error('New plan not found');

      // Recalculate using the same exact proration formula
      const b = this._calcUpgradeBreakdown(currentSub, newPlan);

      if (currentSub) {
        currentSub.status = 'expired';
        currentSub.cancellationDate = new Date();
        await currentSub.save({ session });
      }

      const startDate = new Date();
      const endDate = new Date();
      const durationMonths = newPlan.duration || 12;
      endDate.setMonth(endDate.getMonth() + durationMonths);

      let billingCycle = 'yearly';
      if (durationMonths === 6) billingCycle = 'half-yearly';
      if (durationMonths === 3) billingCycle = 'quarterly';
      if (durationMonths === 1) billingCycle = 'monthly';

      const [newSub] = await VendorSubscription.create([{
        vendorId,
        planId: newPlanId,
        status: 'active',
        billingCycle,
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        // Payment breakdown
        basePrice: b.netBase,          // net base after credit deduction
        gstAmount: b.gstAmount,
        totalAmount: b.finalAmount,
        paidAmount: b.finalAmount,
        // Upgrade audit fields
        oldPlanPrice: b.oldPlanPrice,
        newPlanPrice: b.newPlanPrice,
        usedDays: b.usedDays,
        remainingDays: b.remainingDays,
        unusedCredit: b.unusedCredit,  // credit from old plan, stored explicitly
        discount: 0,                   // no separate plan discount for upgrades
        usage: { lastResetDate: startDate },
        auditLogs: [{
          action: 'subscription_upgrade',
          timestamp: new Date(),
          details: {
            fromPlan: currentSub?.planId?.name || 'Unknown',
            toPlan: newPlan.name,
            oldPlanPrice: b.oldPlanPrice,
            newPlanPrice: b.newPlanPrice,
            usedDays: b.usedDays,
            remainingDays: b.remainingDays,
            unusedCredit: b.unusedCredit,
            netBase: b.netBase,
            gstAmount: b.gstAmount,
            finalAmount: b.finalAmount,
            razorpayPaymentId,
            razorpayOrderId
          }
        }]
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: newSub._id }, { session });
      await session.commitTransaction();

      // Background Zoho/Email Integration
      this.processZohoAndEmailForSubscription(newSub._id).catch(err => {
        console.error('[SubUpgrade][Zoho] background error:', err);
      });

      return newSub;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getSubscriptionAnalytics() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [
        subscriptionRevenueResult,
        totalOrdersResult,
        totalCustomersResult,
        activeSubscriptionsCount,
        planDistribution,
        recentSubscriptionPayments,
        revenueData,
        currentPeriodRes,
        previousPeriodRes,
        previousPeriodCustomersRes
      ] = await Promise.all([
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$vendorId' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        VendorSubscription.countDocuments({ status: 'active' }),
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$planId', count: { $sum: 1 } } },
          { $lookup: { from: 'b2bsubscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
          { $unwind: '$plan' },
          { $project: { name: '$plan.name', count: 1 } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $sort: { 'auditLogs.timestamp': -1 } },
          { $limit: 10 },
          { $lookup: { from: 'vendors', localField: 'vendorId', foreignField: '_id', as: 'vendor' } },
          { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'b2bsubscriptionplans', localField: 'planId', foreignField: '_id', as: 'plan' } },
          { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
          { $project: { vendorName: { $ifNull: ['$vendor.businessName', '$vendor.storeName'] }, amount: '$auditLogs.details.amount', planName: { $ifNull: ['$plan.name', '$auditLogs.details.planName', 'Unknown'] }, date: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } }, status: '$auditLogs.details.status', timestamp: '$auditLogs.timestamp' } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } }, revenue: { $sum: '$auditLogs.details.amount' }, orders: { $sum: 1 } } },
          { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } },
          { $sort: { date: 1 } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $match: { status: 'active', startDate: { $lt: thirtyDaysAgo } } },
          { $group: { _id: '$vendorId' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ])
      ]);

      const totalRevenue = subscriptionRevenueResult[0]?.total || 0;
      const totalOrders = totalOrdersResult[0]?.count || 0;
      const totalCustomers = totalCustomersResult[0]?.count || 0;
      const currentRevenue = currentPeriodRes[0]?.total || 0;
      const previousRevenue = previousPeriodRes[0]?.total || 0;

      const monthlyGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : '0.0';

      return {
        revenue: totalRevenue,
        totalRevenue,
        totalOrders,
        totalCustomers,
        activeSubscriptions: activeSubscriptionsCount,
        monthlyGrowth: `+${monthlyGrowth}%`,
        planDistribution,
        recentPayments: recentSubscriptionPayments.map(p => ({ id: p._id, vendor: p.vendorName || 'Unknown', amount: p.amount, plan: p.planName, date: p.date, status: p.status })),
        revenueData
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async getAllVendorSubscriptions(filters = {}) {
    try {
      const { status, planId, expiringSoon, businessType } = filters;
      const query = {};
      if (status) query.status = status;
      if (planId) query.planId = planId;

      if (businessType && businessType !== 'All Business Types') {
        const vendors = await Vendor.find({ businessType }).select('_id');
        query.vendorId = { $in: vendors.map(v => v._id) };
      }
      if (expiringSoon) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        query.endDate = { $lte: soon, $gte: new Date() };
      }

      const subscriptions = await VendorSubscription.find(query)
        .populate('vendorId', 'businessName storeName email address vendorType businessType')
        .populate('planId', 'name price duration')
        .sort({ createdAt: -1 }).lean();

      return subscriptions.map(sub => ({
        vendorName: sub.vendorId?.storeName || sub.vendorId?.businessName || sub.vendorId?.name || 'Unknown Vendor',
        vendor: sub.vendorId?.businessName || sub.vendorId?.storeName || 'Unknown', // Keep for backward compatibility
        vendorId: sub.vendorId?._id,
        status: sub.status ? (sub.status.charAt(0).toUpperCase() + sub.status.slice(1)) : 'Pending', // Capitalize for frontend comparison val === 'Active'
        plan: sub.planId?.name || 'Unknown Plan',
        planDuration: sub.planId?.duration || 0,
        amount: sub.totalAmount || sub.planId?.price || 0,
        billingCycle: sub.billingCycle 
          ? (sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)) 
          : (sub.planId?.duration ? `${sub.planId.duration} Months` : 'N/A'),
        expiryDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        expiry: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        businessType: sub.vendorId?.businessType || 'B2B Vendor',
        vendorCity: sub.vendorId?.address?.city || '',
        renew: sub.autoRenew,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        subscriptionId: sub._id,
        zohoInvoiceId: sub.zohoInvoiceId
      }));
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      throw error;
    }
  }

  async manualSubscriptionOverride(subscriptionId, action, adminId, details = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const subscription = await VendorSubscription.findById(subscriptionId).session(session);
      if (!subscription) throw new Error('Subscription not found');

      const auditLog = { action: `manual_${action}`, timestamp: new Date(), performedBy: adminId, details };
      
      if (action === 'extend_30_days') {
        subscription.endDate = new Date(new Date(subscription.endDate).getTime() + 30 * 86400000);
        subscription.status = 'active';
      } else if (action === 'cancel_subscription') {
        // Stop auto-payment and upcoming renewals
        subscription.autoRenew = false;
        subscription.cancellationDate = new Date();
        
        // 🔹 Close auto-pay in Razorpay if subscription ID exists
        if (subscription.razorpaySubscriptionId) {
          try {
            await razorpayService.cancelSubscription(subscription.razorpaySubscriptionId);
          } catch (err) {
            console.error('[ManualCancel] Razorpay cancellation failed:', err.message);
            // We proceed as internal cancellation is primary
          }
        }
        
        // Note: We DO NOT set status = 'cancelled' here because
        // user should have access until the period ENDS.
        // A cron or expiry check will set it to 'expired' later.
      }

      subscription.auditLogs.push(auditLog);
      await subscription.save({ session });
      await session.commitTransaction();
      return subscription;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Vendor-side cancellation
   * Stops auto-renewal/RAZORPAY but keeps plan active until endDate
   */
  async cancelVendorSubscription(vendorId) {
    const sub = await VendorSubscription.findOne({ vendorId, status: 'active' });
    if (!sub) throw new Error('No active subscription found to cancel.');

    try {
      sub.autoRenew = false;
      sub.cancellationDate = new Date();
      
      // Stop Razorpay auto-pay
      if (sub.razorpaySubscriptionId) {
        await razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      }

      sub.auditLogs.push({
        action: 'vendor_cancelled_autopay',
        timestamp: new Date(),
        details: { message: 'Vendor stopped auto-renewal from panel' }
      });

      await sub.save();
      return sub;
    } catch (error) {
      console.error('Vendor cancel error:', error);
      throw error;
    }
  }

  async cancelB2BSubscription(subscriptionId, vendorId = null) {
    try {
      const query = { _id: subscriptionId };
      if (vendorId) query.vendorId = vendorId;

      const sub = await VendorSubscription.findOne(query);
      if (!sub) throw new Error('Subscription not found to cancel.');

      sub.status = 'cancelled';
      sub.autoRenew = false;
      sub.cancellationDate = new Date();

      // Stop Razorpay auto-pay
      if (sub.razorpaySubscriptionId) {
        try {
          await razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
        } catch (err) {
          console.error('[CancelB2B] Razorpay cancellation failed:', err.message);
        }
      }

      sub.auditLogs.push({
        action: 'vendor_cancelled_subscription',
        timestamp: new Date(),
        details: { message: 'Vendor cancelled subscription from panel' }
      });

      await sub.save();
      return sub;
    } catch (error) {
      console.error('B2B Cancel error:', error);
      throw error;
    }
  }

  async updateAutoRenewal(vendorId, autoRenew) {
    const sub = await VendorSubscription.findOne({ vendorId, status: 'active' });
    if (!sub) throw new Error('No active subscription');
    
    // If disabling auto-renew, stop it in Razorpay as well
    if (autoRenew === false && sub.razorpaySubscriptionId) {
      try {
        await razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      } catch (err) {
        console.error('[UpdateRenew] Razorpay sync failed:', err.message);
      }
    }

    sub.autoRenew = autoRenew;
    return await sub.save();
  }

  async getVendorBillingHistory(vendorId) {
    const [subs, addons, bannerBookings, walletRecharges] = await Promise.all([
      VendorSubscription.find({ vendorId }).populate('planId').sort({ createdAt: -1 }).lean(),
      (await import('../models/VendorAddon.model.js')).default.find({ vendorId }).populate('addonPlanId').sort({ createdAt: -1 }).lean(),
      (await import('../models/BannerBooking.model.js')).default
        .find({ vendorId, paymentStatus: 'paid' })
        .sort({ createdAt: -1 })
        .lean(),
      (await import('../models/VendorWalletTransaction.model.js')).default
        .find({ vendorId, type: 'credit', referenceType: 'recharge' })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const history = [];

    // Process Subscriptions
    for (const sub of subs) {
      // B2B: Only show plans paid via external methods (not wallet)
      if (sub.paymentMethod === 'wallet') continue;

      if (sub.lastPaymentDate || sub.status === 'active' || sub.status === 'expired') {
        history.push({
          id: sub._id.toString(),
          transactionCode: sub.razorpayOrderId || `SUB-${sub._id}`,
          amount: sub.totalAmount || sub.planId?.price || 0,
          type: 'subscription_payment',
          status: sub.status === 'failed' ? 'failed' : 'completed',
          date: sub.lastPaymentDate || sub.startDate,
          planName: sub.planId?.name || 'Unknown',
          zohoInvoiceId: sub.zohoInvoiceId
        });
      }
    }

    /* 
       Process Addons - REMOVED as per user requirement to only show "Billing" (Recharges/Direct Plans)
       Add-ons are internal wallet debits and shouldn't appear in the main accounting billing section.
    */
    /*
    for (const addon of addons) {
      history.push({
        id: addon._id.toString(),
        transactionCode: addon.razorpayOrderId || `ADDON-${addon._id}`,
        amount: addon.totalAmount || 0,
        type: 'addon_purchase',
        status: addon.status === 'failed' ? 'failed' : 'completed',
        date: addon.purchaseDate || addon.createdAt,
        planName: addon.addonPlanId?.name || `Add-on: ${addon.featureType}`,
        zohoInvoiceId: addon.zohoInvoiceId
      });
    }
    */

    // Process Banner Bookings
    for (const booking of bannerBookings) {
      // B2B: Banner bookings paid via wallet are internal, skip them on Billing page
      if (booking.paymentMethod === 'wallet') continue;

      history.push({
        id: booking._id.toString(),
        transactionCode: booking.referenceId || booking.razorpayOrderId || `BANNER-${booking._id}`,
        amount: booking.amount || 0,
        type: 'banner_booking',
        status: booking.paymentStatus === 'paid' ? 'completed' : booking.paymentStatus,
        date: booking.createdAt,
        planName: booking.title ? `Banner: ${booking.title}` : 'Banner Booking',
        zohoInvoiceId: booking.zohoInvoiceId,
        bannerType: booking.bannerType,
        startDate: booking.startDate,
        endDate: booking.endDate
      });
    }
    
    // Process Wallet Recharges - These are external payments, Keep them!
    for (const recharge of walletRecharges) {
      const totalPaid = recharge.metadata?.totalAmount || Math.round(recharge.amount * 1.18);
      
      history.push({
        id: recharge._id.toString(),
        transactionCode: recharge.referenceId || `WAL-REC-${recharge._id}`,
        amount: totalPaid,
        type: 'wallet_recharge',
        status: 'completed',
        date: recharge.createdAt,
        planName: 'Wallet Recharge',
        zohoInvoiceId: recharge.zohoInvoiceId
      });
    }

    // Sort combined history by date descending
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async processZohoAndEmailForSubscription(subscriptionId, customAmount = null) {
    try {
      console.log(`[SubPay][Zoho] Starting integration helper for subscription: ${subscriptionId.toString()}`);
      const subscriptionDoc = await VendorSubscription.findById(subscriptionId)
        .populate('planId')
        .populate('vendorId');

      if (!subscriptionDoc) return;

      // Avoid duplicate processing
      if (subscriptionDoc.emailNotification?.successSent) {
        console.log('[SubPay][Zoho] Success notification already sent for subscription', subscriptionId.toString());
        return;
      }

      const planDoc = subscriptionDoc.planId;
      const amount = Number(customAmount || subscriptionDoc.totalAmount || planDoc?.price || 0);
      const planName = planDoc?.name || 'Subscription Plan';
      const razorpayPaymentId = subscriptionDoc.razorpayPaymentId;
      const basePrice = Number(subscriptionDoc.basePrice || 0);  // net base after credit
      const gstAmount = Number(subscriptionDoc.gstAmount || 0);
      const discount = Number(subscriptionDoc.discount || 0);    // regular discount (non-upgrade)
      // Upgrade-specific: read stored fields
      const unusedCredit = Number(subscriptionDoc.unusedCredit || 0);
      const newPlanFullPrice = Number(subscriptionDoc.newPlanPrice || 0);
      const isUpgrade = subscriptionDoc.auditLogs?.some(log => log.action === 'subscription_upgrade') || unusedCredit > 0;

      // Construct vendor info, handling both registered and pending vendors
      let vendorInfo = {};
      if (subscriptionDoc.vendorId) {
        const v = subscriptionDoc.vendorId;
        vendorInfo = {
          _id: v._id,
          name: v.businessName || v.storeName || v.name || 'Vendor',
          storeName: v.storeName || v.businessName,
          email: v.email,
          phone: v.phone,
          gstNumber: v.gstNumber,
          zohoContactId: v.zohoContactId || subscriptionDoc.zohoContactId
        };
      } else {
        // Handle pending registration
        vendorInfo = {
          name: 'Pending Vendor',
          email: subscriptionDoc.pendingVendorEmail,
          phone: subscriptionDoc.pendingVendorPhone,
          zohoContactId: subscriptionDoc.zohoContactId
        };
      }

      if (!vendorInfo.email) {
        console.warn('[SubPay][Zoho] No email found for subscription', subscriptionId);
        return;
      }

      // 1. Zoho Contact
      let contactId = vendorInfo.zohoContactId;
      console.log(`[SubPay][Zoho] Syncing contact for vendor: ${vendorInfo.email}, Existing ID: ${contactId || 'None'}`);
      if (!contactId) {
        try {
          // Pass a vendor-like object to ensureZohoContactForVendor
          contactId = await zohoBooksService.ensureZohoContactForVendor({
            email: vendorInfo.email,
            phone: vendorInfo.phone,
            name: vendorInfo.name,
            storeName: vendorInfo.storeName || vendorInfo.name,
            gstNumber: vendorInfo.gstNumber || null,
            zohoContactId: vendorInfo.zohoContactId || null
          });

          console.log(`[SubPay][Zoho] Contact Sync Result: ${contactId}`);
          // Save back to vendor if exists
          if (vendorInfo._id && contactId) {
            await Vendor.findByIdAndUpdate(vendorInfo._id, { zohoContactId: contactId });
          }
        } catch (e) { 
          console.error('[SubPay][Zoho] Sync contact failed:', e.message); 
          await VendorSubscription.findByIdAndUpdate(subscriptionId, {
            $push: { accountingErrors: { at: 'zoho_contact_sync', message: e.message } }
          });
        }
      }

      // 2. Zoho Invoice & Payment (Ensure invoice exists or create it)
      let invoice = null;
      let invoicePdfBuffer = null;
      let existingInvoiceId = subscriptionDoc.zohoInvoiceId;

      if (contactId) {
        try {
          if (!existingInvoiceId) {
            const invoiceRef = `SUB-${subscriptionId.toString()}`;

            // Build notes for invoice
            const upgradeAuditLog = isUpgrade
              ? subscriptionDoc.auditLogs.find(l => l.action === 'subscription_upgrade')
              : null;
            const invoiceNotes = isUpgrade
              ? [
                  `Plan Upgrade Invoice`,
                  `New Plan: ${planName} (Full Price: ₹${newPlanFullPrice})`,
                  `Credit from Previous Plan (${subscriptionDoc.remainingDays || 0} unused days): -₹${unusedCredit}`,
                  `Net Base (After Credit): ₹${basePrice}`,
                  `GST (18% on Net Base): ₹${gstAmount}`,
                  `Total Charged (Razorpay): ₹${amount}`,
                  razorpayPaymentId ? `Transaction ID: ${razorpayPaymentId}` : '',
                  `Previous Plan: ${upgradeAuditLog?.details?.fromPlan || 'N/A'}`,
                ].filter(Boolean).join('\n')
              : [
                  `Subscription Payment`,
                  `Plan: ${planName}`,
                  `Base Amount: ₹${basePrice}`,
                  discount > 0 ? `Discount: -₹${discount}` : '',
                  `GST (18%): ₹${gstAmount}`,
                  `Total Paid: ₹${amount}`,
                  razorpayPaymentId ? `Transaction ID: ${razorpayPaymentId}` : '',
                ].filter(Boolean).join('\n');

            invoice = await zohoBooksService.createSubscriptionInvoice({
              contactId,
              planName,
              amount,
              currency: 'INR',
              referenceNumber: invoiceRef,
              notes: invoiceNotes,
              vendorGstNumber: vendorInfo.gstNumber,
              baseAmount: basePrice,          // net base after credit
              gstAmount: gstAmount,           // GST on net base only
              discount: isUpgrade ? 0 : discount,
              // Upgrade-specific fields — sourced from DB, not inferred
              isUpgrade,
              newPlanFullPrice: isUpgrade ? newPlanFullPrice : null,
              creditFromOldPlan: isUpgrade ? unusedCredit : 0,
            });

            // Mark as sent so it's not a draft (required for PDF and some states)
            if (invoice?.id) {
              existingInvoiceId = invoice.id;
              // PROACTIVELY SAVE ID IMMEDIATELY - Prevents duplicates and ensures visibility if next steps fail
              await VendorSubscription.findByIdAndUpdate(subscriptionId, { 
                zohoInvoiceId: invoice.id
              });

              // PROBABLY THE MOST CRITICAL STEP: Move out of Draft
              const markSentResult = await zohoBooksService.markInvoiceAsSent(invoice.id, true);
              if (markSentResult) {
                  await VendorSubscription.findByIdAndUpdate(subscriptionId, { 
                    zohoInvoiceStatus: 'sent'
                  });
              }
              
              // Record payment immediately if invoice just created
              await zohoBooksService.recordInvoicePayment({
                contactId, 
                invoiceId: invoice.id, 
                amount, 
                paymentDate: new Date(), 
                razorpayPaymentId,
                invoiceTotal: invoice.total // Use Zoho's official total
              });

              await VendorSubscription.findByIdAndUpdate(subscriptionId, { 
                zohoInvoiceStatus: 'paid'
              });
            }
          }

          // If we have an ID (either just created or from a prior run), finish syncing
          if (existingInvoiceId) {
            invoicePdfBuffer = await zohoBooksService.downloadInvoicePdf(existingInvoiceId);
            
            // Sync IDs if they were just obtained or updated
            const updateObj = {
              zohoContactId: contactId,
              zohoInvoiceId: existingInvoiceId,
              zohoInvoiceStatus: 'paid',
              zohoInvoicePdfUrl: invoice?.pdfUrl || subscriptionDoc.zohoInvoicePdfUrl
            };
            await VendorSubscription.findByIdAndUpdate(subscriptionId, updateObj);
          }
        } catch (e) { 
          console.error('[SubPay][Zoho] Invoice/Payment phase failed:', e.message); 
          await VendorSubscription.findByIdAndUpdate(subscriptionId, {
            $push: { accountingErrors: { at: 'zoho_invoice_payment', message: e.message } }
          });
        }
      }

      // 3. Emails
      const vendorEmail = vendorInfo.email;
      const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const commonEmailData = {
        amount, planName, title: planName, paymentFor: 'subscription',
        paymentDate: new Date(), transactionId: razorpayPaymentId,
        referenceId: `SUB-${subscriptionId}`, paymentMethod: 'razorpay',
        vendor: vendorInfo, invoicePdfBuffer
      };

      if (vendorEmail) await sendPaymentSuccessEmail({ ...commonEmailData, to: vendorEmail }).catch(async e => {
        console.error('Vendor email failed:', e.message);
        await VendorSubscription.findByIdAndUpdate(subscriptionId, {
          $push: { accountingErrors: { at: 'vendor_email', message: e.message } }
        });
      });
      if (adminEmail) await sendPaymentSuccessEmail({ ...commonEmailData, to: adminEmail }).catch(async e => {
        console.error('Admin email failed:', e.message);
        await VendorSubscription.findByIdAndUpdate(subscriptionId, {
          $push: { accountingErrors: { at: 'admin_email', message: e.message } }
        });
      });

      await VendorSubscription.findByIdAndUpdate(subscriptionId, {
        zohoContactId: contactId,
        zohoInvoiceId: invoice?.id,
        zohoInvoiceStatus: invoice?.status,
        zohoInvoicePdfUrl: invoice?.pdfUrl,
        emailNotification: { successSent: true, lastSentAt: new Date() }
      });

    } catch (err) {
      console.error('[SubPay][Critical] Integration helper failed:', err);
    }
  }
}

export default new SubscriptionService();
