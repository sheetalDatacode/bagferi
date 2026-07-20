import {
  registerB2BVendor,
} from '../services/b2bVendorRegistration.service.js';
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
