import {
  registerB2BVendor,
  registerB2BVendorWithSubscription,
  initializeB2BRegistrationPayment,
  createB2BSubscriptionAfterPayment
} from '../services/b2bVendorRegistration.service.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import mongoose from 'mongoose';

/**
 * Register B2B vendor (Direct registration, no payment)
 * POST /api/auth/b2b-vendor/register
 */
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      gstNumber,
      businessType,
      businessTypeRef,
      agreedToTerms,
      referralCode,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !storeName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and store name are required',
      });
    }

    console.log('📝 Calling registerB2BVendor service...');

    const result = await registerB2BVendor({
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      gstNumber,
      businessType,
      businessTypeRef,
      agreedToTerms,
      referralCode,
    });

    res.status(201).json({
      success: true,
      message: result.message || 'B2B vendor registered successfully. Please verify your mobile number.',
      data: {
        ...result
      },
    });
  } catch (error) {
    console.error('Error in register:', error);

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Vendor already exists',
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid registration data',
      });
    }

    next(error);
  }
};

/**
 * Register B2B vendor with subscription after payment
 * POST /api/auth/b2b-vendor/register-with-payment
 */
export const registerWithPayment = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      gstNumber,
      businessType,
      businessTypeRef,
      agreedToTerms,
      subscriptionPlan,
      paymentData, // { razorpayOrderId, razorpayPaymentId, razorpaySignature }
      referralCode,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !storeName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and store name are required',
      });
    }

    if (!subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Subscription plan is required',
      });
    }

    if (!paymentData || !paymentData.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification data is required',
      });
    }

    // Log payment data before registration
    console.log('Registration request received:', {
      email,
      subscriptionPlan,
      hasPaymentData: !!paymentData,
      razorpayPaymentId: paymentData?.razorpayPaymentId,
      razorpayOrderId: paymentData?.razorpayOrderId,
      razorpaySignature: paymentData?.razorpaySignature ? 'Present' : 'Missing',
    });

    console.log('📝 Calling registerB2BVendorWithSubscription service...');

    const result = await registerB2BVendorWithSubscription(
      {
        name,
        email,
        phone,
        password,
        storeName,
        storeDescription,
        address,
        documents,
        gstNumber,
        businessType,
        businessTypeRef,
        agreedToTerms,
        referralCode,
      },
      subscriptionPlan,
      paymentData
    );

    // Log successful registration with full details
    console.log('✅ B2B vendor registration successful:', {
      vendorId: result.vendor._id?.toString(),
      vendorEmail: result.vendor.email,
      subscriptionId: result.subscription._id?.toString(),
      planId: result.subscription.planId?.toString() || 'NULL',
      tierId: result.subscription.tierId?.toString() || 'NULL',
      razorpayPaymentId: result.subscription.razorpayPaymentId || 'MISSING',
      razorpayOrderId: result.subscription.razorpayOrderId || 'MISSING',
      razorpaySignature: result.subscription.razorpaySignature ? 'Present' : 'MISSING',
      status: result.subscription.status,
    });

    // Verify payment data in response
    if (!result.subscription.razorpayPaymentId) {
      console.error('⚠️ WARNING: Payment ID missing in response subscription object!');
    }
    if (!result.subscription.planId) {
      console.error('⚠️ WARNING: Plan ID missing in response subscription object!');
    }

    res.status(201).json({
      success: true,
      message: 'B2B vendor registered successfully with subscription',
      data: {
        vendor: result.vendor,
        token: result.token,
        subscription: result.subscription,
      },
    });
  } catch (error) {
    console.error('Error in registerWithPayment:', error);

    // Handle specific errors
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Vendor already exists',
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid registration data',
      });
    }

    if (error.message && error.message.includes('Invalid or inactive subscription plan')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Log full error for debugging
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    });

    next(error);
  }
};

/**
 * Create subscription immediately after payment success (before vendor registration)
 * POST /api/auth/vendor/b2b-vendor/create-subscription-after-payment
 */
export const createSubscriptionAfterPayment = async (req, res, next) => {
  try {
    const { subscriptionPlan, paymentData, email, phone } = req.body;

    if (!subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Subscription plan is required',
      });
    }

    if (!paymentData || !paymentData.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification data is required',
      });
    }

    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email and phone are required',
      });
    }

    console.log('Creating subscription after payment (before registration):', {
      email,
      subscriptionPlan,
      razorpayPaymentId: paymentData.razorpayPaymentId,
    });

    const subscription = await createB2BSubscriptionAfterPayment(
      subscriptionPlan,
      paymentData,
      email,
      phone
    );

    console.log('✅ Subscription created successfully after payment:', {
      subscriptionId: subscription._id.toString(),
      email: subscription.pendingVendorEmail,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully. Please complete your registration.',
      data: {
        subscription: {
          _id: subscription._id,
          planId: subscription.planId,
          razorpayPaymentId: subscription.razorpayPaymentId,
          razorpayOrderId: subscription.razorpayOrderId,
        },
      },
    });
  } catch (error) {
    console.error('Error in createSubscriptionAfterPayment:', error);

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid request data',
      });
    }

    next(error);
  }
};

/**
 * Verify subscription exists in database (for localStorage validation)
 * GET /api/auth/vendor/b2b-vendor/verify-subscription/:subscriptionId
 */
export const verifySubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID',
      });
    }

    const subscription = await VendorSubscription.findById(subscriptionId)
      .populate('planId', 'name duration price')
      .lean();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        data: { subscription: null },
      });
    }

    // Check if subscription has payment data
    if (!subscription.razorpayPaymentId) {
      return res.status(200).json({
        success: true,
        message: 'Subscription found but payment data missing',
        data: { subscription: null },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription verified',
      data: {
        subscription: {
          _id: subscription._id,
          planId: subscription.planId,
          razorpayPaymentId: subscription.razorpayPaymentId,
          razorpayOrderId: subscription.razorpayOrderId,
          pendingVendorEmail: subscription.pendingVendorEmail,
          vendorId: subscription.vendorId,
        },
      },
    });
  } catch (error) {
    console.error('Error in verifySubscription:', error);
    next(error);
  }
};

/**
 * Initialize Razorpay payment for B2B vendor registration
 * POST /api/auth/b2b-vendor/initialize-payment
 */
export const initializePayment = async (req, res, next) => {
  try {
    const { subscriptionPlan } = req.body;

    if (!subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Subscription plan is required',
      });
    }

    const result = await initializeB2BRegistrationPayment(subscriptionPlan);

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in initializePayment:', error);

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid subscription plan',
      });
    }

    if (error.message && error.message.includes('Invalid or inactive subscription plan')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message && error.message.includes('Razorpay not configured')) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured. Please contact support.',
      });
    }

    // Log full error for debugging
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    });

    next(error);
  }
};
