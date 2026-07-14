import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import mongoose from 'mongoose';

class B2BVendorSubscriptionService {
  /**
   * Get all B2B vendor subscriptions
   * @param {Object} filters - Filter options
   * @param {String} filters.status - Filter by status
   * @param {String} filters.planId - Filter by plan ID
   * @param {Boolean} filters.expiringSoon - Filter expiring soon subscriptions
   * @returns {Promise<Object>} Subscriptions with stats
   */
  async getAllB2BSubscriptions(filters = {}) {
    try {
      // PERFORMANCE OPTIMIZATION: 
      // Instead of fetching all B2B vendors first, we query subscriptions directly
      // and filter by vendor type using populate with match

      // Build query with planId filter
      const query = {
        planId: { $exists: true, $ne: null }
      };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.planId) {
        query.planId = new mongoose.Types.ObjectId(filters.planId);
      }

      // Add date filter for expiringSoon at database level
      if (filters.expiringSoon) {
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        query.status = 'active';
        query.endDate = { $gt: now, $lte: sevenDaysFromNow };
      }

      const vendorMatch = { vendorType: 'b2b' };
      if (filters.businessType) {
        vendorMatch.businessType = filters.businessType;
      }

      // Get subscriptions and filter B2B vendors using populate match
      let subscriptions = await VendorSubscription.find(query)
        .populate({
          path: 'vendorId',
          select: 'name email storeName vendorType businessType',
          match: vendorMatch
        })
        .populate('planId', 'name duration price')
        .sort({ createdAt: -1 })
        .lean();

      // Filter out subscriptions where vendor didn't match (non-B2B)
      subscriptions = subscriptions.filter(sub => sub.vendorId !== null);

      // Calculate stats
      const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        pending: subscriptions.filter(s => s.status === 'pending').length,
        expiringSoon: subscriptions.filter(s => {
          if (s.status !== 'active') return false;
          const endDate = new Date(s.endDate);
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          return endDate <= sevenDaysFromNow && endDate > new Date();
        }).length,
        monthlyRevenue: this.calculateMonthlyRevenue(subscriptions),
        totalCollectedRevenue: this.calculateTotalCollectedRevenue(subscriptions)
      };

      // Format subscriptions for frontend
      const formattedSubscriptions = subscriptions.map(sub => ({
        _id: sub._id,
        vendorName: sub.vendorId?.storeName || sub.vendorId?.name || 'Unknown Vendor',
        vendorEmail: sub.vendorId?.email || '',
        businessType: sub.vendorId?.businessType || 'B2B Vendor',
        plan: sub.planId?.name || 'Unknown Plan',
        planDuration: sub.planId?.duration || 0,
        status: sub.status ? (sub.status.charAt(0).toUpperCase() + sub.status.slice(1)) : 'Pending',
        amount: sub.totalAmount || sub.planId?.price || 0,
        billingCycle: this.getBillingCycleLabel(sub.planId?.duration),
        expiryDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        lastPaymentDate: sub.lastPaymentDate || sub.startDate,
        paymentId: sub.razorpayPaymentId || 'N/A',
        paymentMethod: sub.paymentMethod || 'Razorpay',
        autoRenew: sub.autoRenew || false
      }));

      return {
        subscriptions: formattedSubscriptions,
        stats
      };
    } catch (error) {
      throw new Error(`Failed to fetch B2B subscriptions: ${error.message}`);
    }
  }

  /**
   * Calculate monthly revenue from active subscriptions
   */
  calculateMonthlyRevenue(subscriptions) {
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    let revenue = 0;

    activeSubs.forEach(sub => {
      if (sub.planId && sub.planId.price) {
        // Calculate monthly equivalent
        const duration = sub.planId.duration || 1;
        const monthlyPrice = sub.planId.price / duration;
        revenue += monthlyPrice;
      }
    });

    return Math.round(revenue);
  }

  /**
   * Calculate total collected revenue from all subscriptions
   */
  calculateTotalCollectedRevenue(subscriptions) {
    let total = 0;
    subscriptions.forEach(sub => {
      if (sub.planId && sub.planId.price && sub.status !== 'pending' && sub.status !== 'failed') {
        total += sub.planId.price;
      }
    });
    return Math.round(total);
  }

  /**
   * Get billing cycle label from duration
   */
  getBillingCycleLabel(duration) {
    if (!duration) return 'N/A';
    if (duration === 3) return '3 Months';
    if (duration === 6) return '6 Months';
    if (duration === 12) return '1 Year';
    return `${duration} Months`;
  }
}

export default new B2BVendorSubscriptionService();
