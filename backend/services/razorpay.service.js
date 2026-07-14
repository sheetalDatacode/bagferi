import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class RazorpayService {
  constructor() {
    this.razorpay = null;
    this.initializeRazorpay();
  }

  /**
   * Initialize Razorpay instance with keys from environment variables
   */
  initializeRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn('⚠️ Razorpay keys not found in environment variables');
      console.warn('⚠️ Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your backend/.env file');
      return;
    }

    // Validate key format
    if (!keyId.startsWith('rzp_')) {
      console.warn('⚠️ Invalid RAZORPAY_KEY_ID format. Should start with "rzp_"');
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('✅ Razorpay initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay:', error.message);
      throw error;
    }
  }

  /**
   * Create an order in Razorpay
   * @param {Number} amount - Amount in rupees (e.g., 100 for ₹100)
   * @param {String} currency - Currency code (default: 'INR')
   * @param {String} receipt - Receipt ID for the order
   * @param {Object} notes - Additional notes/metadata
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(amount, currency = 'INR', receipt, notes = {}) {
    // Check if Razorpay is initialized
    if (!this.razorpay) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new Error('Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.');
      }

      // Try to re-initialize
      this.initializeRazorpay();

      if (!this.razorpay) {
        throw new Error('Failed to initialize Razorpay. Please check your API keys.');
      }
    }

    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount. Amount must be greater than 0');
      }

      // Minimum amount for Razorpay is 100 paise (₹1)
      const amountInPaise = Math.round(amount * 100);
      if (amountInPaise < 100) {
        throw new Error('Amount must be at least ₹1 (100 paise)');
      }

      const options = {
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {},
      };

      console.log('Creating Razorpay order with options:', {
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
      });

      const order = await this.razorpay.orders.create(options);

      console.log('Razorpay order created successfully:', order.id);

      return {
        id: order.id,
        entity: order.entity,
        amount: order.amount,
        amount_paid: order.amount_paid,
        amount_due: order.amount_due,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        attempts: order.attempts,
        notes: order.notes,
        created_at: order.created_at,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });

      // Provide more specific error messages
      if (error.statusCode === 401) {
        throw new Error('Razorpay authentication failed. Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file.');
      } else if (error.statusCode === 400) {
        throw new Error(`Invalid Razorpay request: ${error.error?.description || error.message}`);
      } else {
        throw new Error(`Failed to create Razorpay order: ${error.error?.description || error.message}`);
      }
    }
  }

  /**
   * Verify payment signature
   * @param {String} orderId - Razorpay order ID
   * @param {String} paymentId - Razorpay payment ID
   * @param {String} signature - Payment signature from Razorpay
   * @returns {Boolean} True if signature is valid
   */
  verifyPayment(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        throw new Error('Razorpay key secret not found');
      }

      // Create the signature string
      const payload = `${orderId}|${paymentId}`;

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures
      const isValid = expectedSignature === signature;

      if (!isValid) {
        console.warn('⚠️ Payment signature verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Capture payment (for manual capture if needed)
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to capture in rupees
   * @returns {Promise<Object>} Captured payment object
   */
  async capturePayment(paymentId, amount) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const captureAmount = Math.round(amount * 100); // Convert to paise
      const payment = await this.razorpay.payments.capture(paymentId, captureAmount);
      return payment;
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  /**
   * Get payment details from Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(paymentId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Get order details from Razorpay
   * @param {String} orderId - Razorpay order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw new Error(`Failed to fetch order details: ${error.message}`);
    }
  }

  /**
   * Refund a payment
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to refund in rupees (optional, full refund if not provided)
   * @param {String} notes - Refund notes
   * @returns {Promise<Object>} Refund details
   */
  async refundPayment(paymentId, amount = null, notes = {}) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const refundData = {
        notes: notes,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  /**
   * Create a subscription plan in Razorpay
   * @param {Object} planData - Plan details
   * @param {string} planData.name - Plan name
   * @param {number} planData.amount - Amount in rupees
   * @param {string} planData.currency - Currency code (default: 'INR')
   * @param {string} planData.period - 'daily', 'weekly', 'monthly', 'yearly'
   * @param {number} planData.interval - Billing interval (default: 1)
   * @param {string} planData.description - Plan description
   * @returns {Promise<Object>} Created plan object
   */
  async createPlan({ name, amount, currency = 'INR', period = 'monthly', interval = 1, description }) {
    if (!this.razorpay) {
      this.initializeRazorpay();
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }
    }

    try {
      const planOptions = {
        period,
        interval,
        item: {
          name,
          amount: Math.round(amount * 100), // Convert to paise
          currency: currency.toUpperCase(),
          description
        }
      };

      console.log('Creating Razorpay plan:', planOptions);
      const plan = await this.razorpay.plans.create(planOptions);
      console.log('Razorpay plan created:', plan.id);
      return plan;
    } catch (error) {
      console.error('Error creating Razorpay plan:', error);
      throw new Error(`Failed to create Razorpay plan: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription in Razorpay
   * @param {string} subscriptionId - Razorpay Subscription ID
   * @returns {Promise<Object>} Cancelled subscription object
   */
  async cancelSubscription(subscriptionId) {
    if (!this.razorpay) {
      this.initializeRazorpay();
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }
    }

    try {
      console.log('Cancelling Razorpay subscription:', subscriptionId);
      // cancel(subscriptionId, cancelAtCycleEnd = false, details = {})
      const sub = await this.razorpay.subscriptions.cancel(subscriptionId);
      console.log('Razorpay subscription cancelled:', subscriptionId);
      return sub;
    } catch (error) {
      console.error('Error cancelling Razorpay subscription:', error);
      throw new Error(`Failed to cancel Razorpay subscription: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new RazorpayService();

