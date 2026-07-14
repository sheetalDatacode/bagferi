/**
 * Initialize Razorpay Checkout
 * @param {Object} options - Razorpay checkout options
 * @param {String} options.key - Razorpay key ID
 * @param {Number} options.amount - Amount in rupees
 * @param {String} options.currency - Currency code (default: INR)
 * @param {String} options.name - Company/App name
 * @param {String} options.description - Order description
 * @param {String} options.orderId - Razorpay order ID
 * @param {String} options.prefill.name - Customer name
 * @param {String} options.prefill.email - Customer email
 * @param {String} options.prefill.contact - Customer phone
 * @param {Function} options.handler - Success callback
 * @param {Function} options.modal - Modal options
 * @returns {Promise} Razorpay checkout promise
 */
/**
 * Helper to dynamically load script
 */
const loadScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay Checkout
 * @param {Object} options - Razorpay checkout options
...
 */
export const initializeRazorpayCheckout = async (options) => {
  // Check if Razorpay is loaded, if not try to load it dynamically
  if (typeof window.Razorpay === 'undefined') {
    console.log('Razorpay SDK not found, attempting to load dynamically...');
    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!loaded || typeof window.Razorpay === 'undefined') {
      throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
    }
  }

  return new Promise((resolve, reject) => {

    const {
      key,
      amount,
      currency = 'INR',
      name = 'Dealing India',
      description = 'Order Payment',
      orderId,
      prefill = {},
      handler,
      modal = {},
    } = options;

    if (!key || !amount || !orderId) {
      reject(new Error('Missing required Razorpay options: key, amount, or orderId'));
      return;
    }

    // Handle modal dismissal
    const handleModalDismiss = () => {
      if (modal.ondismiss) {
        modal.ondismiss();
      }
      reject(new Error('Payment cancelled by user'));
    };

    const razorpayOptions = {
      key,
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      name,
      description,
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.contact || '',
      },
      theme: {
        color: '#10b981', // Green color matching app theme
      },
      modal: {
        ...modal,
        ondismiss: handleModalDismiss,
      },
      handler: (response) => {
        if (handler) {
          handler(response);
        }
        resolve(response);
      },
    };

    try {
      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.on('payment.failed', (response) => {
        reject(new Error(response.error.description || 'Payment failed'));
      });
      razorpay.open();
    } catch (error) {
      console.error('Razorpay initialization failed:', error);
      reject(error);
    }
  });
};

/**
 * Handle payment success
 * @param {Object} response - Razorpay payment response
 * @returns {Object} Formatted payment response
 */
export const handlePaymentSuccess = (response) => {
  return {
    razorpayOrderId: response.razorpay_order_id,
    razorpayPaymentId: response.razorpay_payment_id,
    razorpaySignature: response.razorpay_signature,
  };
};

/**
 * Handle payment error
 * @param {Error} error - Payment error
 * @returns {Object} Error details
 */
export const handlePaymentError = (error) => {
  return {
    success: false,
    message: error.message || 'Payment failed. Please try again.',
    error: error,
  };
};

