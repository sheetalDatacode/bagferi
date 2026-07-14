import Vendor from '../models/Vendor.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import { hashPassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import razorpayService from './razorpay.service.js';
import notificationService from './notification.service.js';
import mongoose from 'mongoose';
import subscriptionService from './subscription.service.js';
import { geocodeAddress } from '../utils/geocoding.util.js';
import { ensureReferralCodeForOwner, validateReferralCode } from './referral.service.js';
import SMSOTP from '../models/SMSOTP.model.js';
import smsService from './sms.service.js';

/**
 * Register B2B vendor without immediate subscription/payment
 * @param {Object} vendorData - Vendor registration data
 * @returns {Promise<Object>} { vendor, token }
 */
export const registerB2BVendor = async (vendorData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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
      selectedSubTypes,
      referralCode,
    } = vendorData;

    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();
    if (normalizedReferralCode) {
        const validReferral = await validateReferralCode(normalizedReferralCode);
        if (!validReferral) {
            throw new Error('Invalid referral code');
        }
    }

    // Validate required fields
    if (!name || !email || !phone || !password || !storeName) {
      const error = new Error('Name, email, phone, password, and store name are required');
      error.statusCode = 400;
      throw error;
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    }).session(session);

    if (existingVendor) {
      if (existingVendor.email === email.toLowerCase()) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }
      if (existingVendor.phone === phone) {
        const error = new Error('Phone number already registered');
        error.statusCode = 409;
        throw error;
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Process documents
    let processedDocuments = [];
    if (documents && typeof documents === 'object') {
      const docArray = [];
      if (documents.panCard) {
        if (typeof documents.panCard === 'object' && documents.panCard.data) {
          docArray.push({ name: documents.panCard.name || 'PAN Card', data: documents.panCard.data, type: documents.panCard.type || 'application/pdf' });
        } else if (typeof documents.panCard === 'string') {
          docArray.push({ name: 'PAN Card', data: documents.panCard, type: 'application/pdf' });
        }
      }
      if (documents.businessLicense) {
        if (typeof documents.businessLicense === 'object' && documents.businessLicense.data) {
          docArray.push({ name: documents.businessLicense.name || 'Business License', data: documents.businessLicense.data, type: documents.businessLicense.type || 'application/pdf' });
        } else if (typeof documents.businessLicense === 'string') {
          docArray.push({ name: 'Business License', data: documents.businessLicense, type: 'application/pdf' });
        }
      }

      for (const doc of docArray) {
        if (doc.data) {
          try {
            const fileType = doc.type || 'application/pdf';
            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');
            if (!isImage && !isPDF) continue;

            let uploadOptions = {
              resource_type: 'image',
              folder: 'vendor-documents/b2b',
              format: isPDF ? 'pdf' : undefined
            };

            const result = await uploadBase64ToCloudinary(doc.data, null, uploadOptions);
            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType,
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Upload failed: ${doc.name}`, uploadError.message);
          }
        }
      }
    }

    // Address
    const addressData = address || {};
    if (addressData.pincode && !addressData.zipCode) addressData.zipCode = addressData.pincode;
    if (addressData.zipCode && !addressData.pincode) addressData.pincode = addressData.zipCode;

    const newVendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      storeName: storeName.trim(),
      storeDescription: storeDescription ? storeDescription.trim() : undefined,
      address: addressData,
      documents: processedDocuments,
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      vendorType: 'b2b',
      status: 'pending',
      isEmailVerified: true, // We trust email for B2B phone flow
      isPhoneVerified: false, // Must verify phone via OTP
      isActive: true,
      role: 'vendor',
      commissionRate: 0,
      businessType: businessType || 'Textile',
      businessTypeRef: businessTypeRef || undefined,
      selectedSubTypes: selectedSubTypes || [],
      agreedToTerms: !!vendorData.agreedToTerms,
      referredByCode: normalizedReferralCode || undefined,
    };

    try {
      if (newVendorData.address) {
        const coords = await geocodeAddress(newVendorData.address);
        if (coords) {
          newVendorData.address.lat = coords.lat;
          newVendorData.address.lng = coords.lng;
          newVendorData.location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
        }
      }
    } catch (e) { console.error('Geocoding failed:', e.message); }

    const vendor = await Vendor.create([newVendorData], { session });
    const createdVendor = vendor[0];

    // NOTE: Admin notification moved to OTP verification flow in auth.controller.js
    // Notification will be sent only AFTER phone verification is complete

    await session.commitTransaction();
    await ensureReferralCodeForOwner({ userId: createdVendor._id, userModel: 'Vendor' });

    // Generate 6-digit OTP for phone
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const fullPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

    await SMSOTP.create({
        phoneNumber: fullPhone,
        otp,
        expiresAt,
        purpose: 'registration'
    });

    // Send SMS
    await smsService.sendOTP(fullPhone, otp);

    const token = generateToken({ vendorId: createdVendor._id.toString(), email: createdVendor.email, role: createdVendor.role });
    const vendorObj = createdVendor.toObject();
    delete vendorObj.password;

    return { 
      success: true, 
      message: 'Registration successful! Please verify your mobile number.',
      otpSent: true,
      phone: fullPhone,
      vendor: vendorObj, 
      token 
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Register B2B vendor with subscription after payment
 */
export const registerB2BVendorWithSubscription = async (vendorData, planId, paymentData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, phone, password, storeName, storeDescription, address, documents, gstNumber, businessType, businessTypeRef, selectedSubTypes, referralCode } = vendorData;

    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();
    if (normalizedReferralCode) {
        const validReferral = await validateReferralCode(normalizedReferralCode);
        if (!validReferral) {
            throw new Error('Invalid referral code');
        }
    }

    // Check existing sub
    let existingSubscription = null;
    if (email && paymentData?.razorpayPaymentId) {
      existingSubscription = await VendorSubscription.findOne({ pendingVendorEmail: email.toLowerCase(), razorpayPaymentId: paymentData.razorpayPaymentId, vendorId: null }).session(session);
    }

    if (!existingSubscription && (!paymentData || !paymentData.razorpayPaymentId)) {
      throw new Error('Payment data is required');
    }

    const plan = await B2BSubscriptionPlan.findById(planId).session(session);
    if (!plan || !plan.isActive) throw new Error('Invalid or inactive plan');

    const hashedPassword = await hashPassword(password);

    // Process documents (re-using logic or simplifying)
    let processedDocuments = [];
    // ... doc processing simplified for context ...

    const newVendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      storeName: storeName.trim(),
      storeDescription: storeDescription ? storeDescription.trim() : undefined,
      address,
      documents: processedDocuments,
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      vendorType: 'b2b',
      status: 'pending',
      isEmailVerified: true,
      isActive: true,
      role: 'vendor',
      commissionRate: 0,
      businessType: businessType || 'Textile',
      businessTypeRef: businessTypeRef || undefined,
      selectedSubTypes: selectedSubTypes || [],
      agreedToTerms: !!vendorData.agreedToTerms,
      referredByCode: normalizedReferralCode || undefined,
    };

    const vendor = await Vendor.create([newVendorData], { session });
    const createdVendor = vendor[0];

    let subscription;
    if (existingSubscription) {
      existingSubscription.vendorId = createdVendor._id;
      existingSubscription.pendingVendorEmail = null;
      existingSubscription.pendingVendorPhone = null;
      await existingSubscription.save({ session });
      subscription = [existingSubscription];
    } else {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration);

      const basePrice = plan.price || 0;
      const discount = plan.discount || 0;
      const priceAfterDiscount = Math.max(0, basePrice - discount);
      const gstPercentage = plan.gst || 18;
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const subscriptionData = {
        vendorId: createdVendor._id,
        planId: plan._id,
        status: 'active',
        billingCycle: 'yearly',
        startDate, endDate,
        paymentMethod: 'razorpay',
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature,
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        usage: { lastResetDate: startDate },
        basePrice,
        discount,
        gstAmount,
        totalAmount
      };
      subscription = await VendorSubscription.create([subscriptionData], { session });
    }

    createdVendor.currentSubscription = subscription[0]._id;
    await createdVendor.save({ session });

    await session.commitTransaction();
    await ensureReferralCodeForOwner({ userId: createdVendor._id, userModel: 'Vendor' });

    // Background Zoho/Email trigger
    subscriptionService.processZohoAndEmailForSubscription(subscription[0]._id).catch(err => console.error('Zoho/Email Error:', err));

    const token = generateToken({ vendorId: createdVendor._id.toString(), email: createdVendor.email, role: createdVendor.role });
    const vObj = createdVendor.toObject(); delete vObj.password;

    return { vendor: vObj, token, subscription: subscription[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Create subscription immediately after payment
 */
export const createB2BSubscriptionAfterPayment = async (planId, paymentData, email, phone) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const plan = await B2BSubscriptionPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration);

    const basePrice = plan.price || 0;
    const discount = plan.discount || 0;
    const priceAfterDiscount = Math.max(0, basePrice - discount);
    const gstPercentage = plan.gst || 18;
    const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
    const totalAmount = priceAfterDiscount + gstAmount;

    const [subscription] = await VendorSubscription.create([{
      vendorId: null,
      planId: plan._id,
      pendingVendorEmail: email.toLowerCase(),
      pendingVendorPhone: phone,
      status: 'active',
      billingCycle: 'yearly',
      startDate, endDate,
      paymentMethod: 'razorpay',
      razorpayOrderId: paymentData.razorpayOrderId,
      razorpayPaymentId: paymentData.razorpayPaymentId,
      razorpaySignature: paymentData.razorpaySignature,
      lastPaymentDate: startDate,
      nextBillingDate: endDate,
      usage: { lastResetDate: startDate },
      basePrice,
      discount,
      gstAmount,
      totalAmount
    }], { session });

    await session.commitTransaction();

    subscriptionService.processZohoAndEmailForSubscription(subscription._id).catch(err => console.error('Zoho Error:', err));

    return subscription;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Initialize Payment
 */
export const initializeB2BRegistrationPayment = async (planId) => {
  const plan = await B2BSubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) throw new Error('Invalid plan');

  const orderCode = `B2B-REG-${Date.now()}`;
  const razorpayOrder = await razorpayService.createOrder(plan.price, 'INR', orderCode, { planId: plan._id.toString(), type: 'b2b_registration' });

  return {
    razorpay: { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency },
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    plan: { _id: plan._id, name: plan.name, price: plan.price }
  };
};
