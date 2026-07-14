import SubscriptionService from '../services/subscription.service.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';
import zohoBooksService from '../services/zohoBooks.service.js';

class VendorSubscriptionController {
  async getTiers(req, res) {
    try {
      const plans = await SubscriptionService.getAllPlans();
      res.status(200).json({ success: true, data: plans || [] });
    } catch (error) {
      console.error('Error getting plans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription plans'
      });
    }
  }

  /**
   * Get complete subscription status with listing limits
   * Used by frontend to determine what actions are allowed
   */
  async getSubscriptionStatus(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found'
        });
      }

      const status = await subscriptionRulesService.getSubscriptionStatus(vendorId);

      res.status(200).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription status'
      });
    }
  }

  async getCurrentSubscription(req, res) {
    try {
      // Get vendor ID from req.user (set by authenticate middleware)
      const vendorId = req.user?.vendorId || req.userDoc?._id;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found'
        });
      }

      const subscription = await SubscriptionService.getVendorSubscription(vendorId);
      // Return null if no subscription found (this is valid - vendor might not have subscribed yet)
      // Add timestamp to help frontend detect changes
      res.status(200).json({
        success: true,
        data: subscription,
        timestamp: new Date().toISOString() // Add timestamp to force refresh detection
      });
    } catch (error) {
      console.error('Error getting current subscription:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription'
      });
    }
  }

  async initializeSubscription(req, res) {
    try {
      const { planId } = req.body;
      const finalPlanId = planId;

      if (!finalPlanId) {
        return res.status(400).json({ success: false, message: 'Plan ID is required' });
      }

      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const io = req.app.get('io');
      const result = await SubscriptionService.initializeSubscription(
        vendorId,
        finalPlanId,
        io
      );

      res.status(200).json({
        success: true,
        message: result.razorpay ? 'Payment initialized. Please proceed with payment.' : 'Free subscription activated.',
        data: {
          subscription: result.subscription,
          razorpay: result.razorpay ? {
            orderId: result.razorpay.id,
            amount: result.razorpay.amount,
            currency: result.razorpay.currency,
            keyId: result.razorpayKeyId
          } : null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { vendorId, planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const finalPlanId = planId;

      // Validate required fields
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'All payment details are required'
        });
      }

      // Get vendorId from authenticated user or request body
      const authenticatedVendorId = req.user?.vendorId || req.userDoc?._id;
      const finalVendorId = vendorId || authenticatedVendorId;

      if (!finalVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      if (!finalPlanId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required'
        });
      }

      const io = req.app.get('io');
      const subscription = await SubscriptionService.verifySubscriptionPayment(
        finalVendorId,
        finalPlanId,
        {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        },
        io
      );

      res.status(200).json({
        success: true,
        message: 'Payment verified and subscription activated successfully',
        data: subscription
      });
    } catch (error) {
      // Handle payment failure specifically
      const statusCode = error.message?.includes('Payment not successful') ||
        error.message?.includes('verification failed') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Payment verification failed'
      });
    }
  }

  async subscribe(req, res) {
    try {
      const { planId, billingCycle, paymentMethod } = req.body;
      const finalPlanId = planId;
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const subscription = await SubscriptionService.subscribeVendor(
        vendorId,
        finalPlanId,
        billingCycle,
        paymentMethod
      );
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async upgrade(req, res) {
    try {
      const { newPlanId, billingCycle } = req.body;
      const finalPlanId = newPlanId;
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const subscription = await SubscriptionService.upgradeSubscription(
        vendorId,
        finalPlanId,
        billingCycle
      );
      res.status(200).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const subscription = await SubscriptionService.cancelVendorSubscription(vendorId);
      res.status(200).json({
        success: true,
        message: 'Auto-renewal stopped. Your plan remains active until the end of the current period.',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateRenewal(req, res) {
    try {
      const { autoRenew } = req.body;
      const vendorId = req.user?.vendorId || req.userDoc?._id;

      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      if (typeof autoRenew !== 'boolean') {
        return res.status(400).json({ success: false, message: 'autoRenew must be a boolean' });
      }

      const subscription = await SubscriptionService.updateAutoRenewal(vendorId, autoRenew);
      res.status(200).json({
        success: true,
        message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`,
        data: subscription
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBillingHistory(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      const { filter = 'all' } = req.query;

      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const billingHistory = await SubscriptionService.getVendorBillingHistory(vendorId, filter);

      // Always return success with data (even if empty array)
      res.status(200).json({
        success: true,
        data: billingHistory || []
      });
    } catch (error) {
      console.error('Error in getBillingHistory controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to load billing history'
      });
    }
  }

  async downloadInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      if (!invoiceId) {
        return res.status(400).json({ success: false, message: 'Invoice ID is required' });
      }

      const pdfBuffer = await zohoBooksService.downloadInvoicePdf(invoiceId);
      if (!pdfBuffer) {
        return res.status(404).json({ success: false, message: 'Invoice PDF not found' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to download invoice' });
    }
  }

  /**
   * Purchase subscription using wallet balance
   * POST /vendor/subscriptions/purchase-wallet
   */
  async purchaseViaWallet(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ success: false, message: 'Plan ID is required' });
      }

      const subscription = await SubscriptionService.purchaseSubscriptionViaWallet(vendorId, planId);

      res.status(200).json({
        success: true,
        data: subscription,
        message: 'Subscription activated successfully using wallet balance'
      });
    } catch (error) {
      console.error('Error in purchaseViaWallet controller:', error);
      const isBalanceError = error.message?.includes('Insufficient wallet balance');
      res.status(isBalanceError ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to purchase subscription using wallet'
      });
    }
  }
}

export default new VendorSubscriptionController();
