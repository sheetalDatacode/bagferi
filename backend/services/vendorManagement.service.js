import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import User from '../models/User.model.js';

import redisService from './redis.service.js';
import mongoose from 'mongoose';
import ShopUnit from '../models/ShopUnit.model.js';
import VendorFollow from '../models/VendorFollow.model.js';

/**
 * Get all vendors with optional filters
 * @param {Object} filters - { status, search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getAllVendors = async (filters = {}) => {
  try {
    const {
      status,
      isActive,
      search,
      vendorType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      excludeBusinessTypes,
      businessType,
      strict,
      city
    } = filters;

    // Build query
    const query = {};

    // Force B2B vendors only for this service
    query.vendorType = 'b2b';

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by isActive if provided
    if (isActive !== undefined && isActive !== null) {
      query.isActive = isActive === true || isActive === 'true';
    }

    // Search filter
    if (search) {
      const isStrict = strict === 'true' || strict === true;
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexValue = isStrict ? new RegExp('^' + escapedSearch, 'i') : new RegExp(escapedSearch, 'i');

      // Find ShopUnits matching the search to include their vendorIds
      const matchingShopUnits = await ShopUnit.find({
        name: { $regex: regexValue }
      }).select('vendorId').lean();

      const matchingVendorIdsFromShops = matchingShopUnits.map(unit => unit.vendorId);

      query.$or = [
        { name: { $regex: regexValue } },
        { email: { $regex: regexValue } },
        { storeName: { $regex: regexValue } },
        { phone: { $regex: regexValue } },
        { _id: { $in: matchingVendorIdsFromShops } }
      ];
    }

    // Business type filters
    if (businessType) {
      query.businessType = { $regex: new RegExp(`^${String(businessType).trim()}$`, 'i') };
    } else if (excludeBusinessTypes) {
      const excludeArr = Array.isArray(excludeBusinessTypes) ? excludeBusinessTypes : String(excludeBusinessTypes).split(',').map(t => t.trim());
      if (excludeArr.length > 0) {
        query.businessType = { $nin: excludeArr.map(t => new RegExp(`^${t}$`, 'i')) };
      }
    }

    // Filter by city (address.city, case-insensitive)
    if (city && String(city).trim()) {
      const cityEscaped = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['address.city'] = new RegExp('^' + cityEscaped + '$', 'i');
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [vendorsRaw, total] = await Promise.all([
      Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vendor.countDocuments(query),
    ]);

    const vendors = vendorsRaw.map(vendor => ({
      ...vendor,
      address: {
        street: vendor.address?.street || '',
        area: vendor.address?.area || '',
        landmark: vendor.address?.landmark || '',
        city: (vendor.address?.city || '').replace(/\s+\d{6}$/, '').trim(),
        state: (vendor.address?.state || '').replace(/\s+\d{6}$/, '').trim(),
        pincode: (function () {
          const addr = vendor.address || {};
          const directPin = addr.pincode || addr.zipCode || addr.pinCode;
          if (directPin && /^\d{5,6}$/.test(String(directPin).trim())) return String(directPin).trim();
          const searchFields = [addr.state, addr.city, addr.street, addr.landmark];
          for (const field of searchFields) {
            const match = String(field || '').match(/\d{6}/);
            if (match) return match[0];
          }
          return directPin || '';
        })(),
        country: vendor.address?.country || 'India',
        market: vendor.address?.market || '',
      },
      performance: { totalOrders: 0, totalEarnings: 0 }
    }));
    
    // Add follower count
    const vendorIds = vendors.map(v => v._id);
    const followCounts = await VendorFollow.aggregate([
      { $match: { vendorId: { $in: vendorIds } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } }
    ]);
    
    const countMap = followCounts.reduce((acc, curr) => ({ ...acc, [curr._id.toString()]: curr.count }), {});
    
    vendors.forEach(v => {
      v.followerCount = countMap[v._id.toString()] || 0;
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      vendors,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor by ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor object
 */
export const getVendorById = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    if (vendor && vendor.address) {
      // Robust pincode mapping
      const addr = vendor.address;
      const directPin = addr.pincode || addr.zipCode || addr.pinCode;

      if (directPin && /^\d{5,6}$/.test(String(directPin).trim())) {
        vendor.address.pincode = String(directPin).trim();
      } else {
        // Try to extract from other fields
        const searchFields = [addr.state, addr.city, addr.street, addr.landmark];
        let foundPin = null;
        for (const field of searchFields) {
          const match = String(field || '').match(/\d{6}/);
          if (match) {
            foundPin = match[0];
            break;
          }
        }
        vendor.address.pincode = foundPin || directPin || '';
      }

      // Clean city/state from trailing pincodes
      if (vendor.address.city) vendor.address.city = vendor.address.city.replace(/\s+\d{6}$/, '').trim();
      if (vendor.address.state) vendor.address.state = vendor.address.state.replace(/\s+\d{6}$/, '').trim();
    }
    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Update vendor status
 * @param {String} vendorId - Vendor ID
 * @param {String} status - New status (pending, approved, rejected)
 * @param {String} reason - Optional reason for status change
 * @returns {Promise<Object>} Updated vendor
 */
export const updateVendorStatus = async (vendorId, status, reason = null, isActive = null) => {
  try {
    const updateData = {};

    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be one of: pending, approved, rejected');
      }
      updateData.status = status;
      
      // Auto-verify phone if admin approves the vendor
      if (status === 'approved') {
        updateData.isPhoneVerified = true;
      }
    }

    if (isActive !== null && isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid update data provided');
    }

    if (reason) {
      updateData.suspensionReason = reason;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true, runValidators: true }
    ); // Removed lean() to access email easily if needed, but actually findByIdAndUpdate returns it

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Sync isActive status with User model if it was updated
    if (updateData.isActive !== undefined) {
      try {
        const userUpdateResult = await User.updateMany(
          { email: vendor.email },
          { isActive: updateData.isActive }
        );
        if (userUpdateResult.modifiedCount > 0) {
          console.log(`[Sync] Updated ${userUpdateResult.modifiedCount} user accounts for vendor email: ${vendor.email} to isActive: ${updateData.isActive}`);
        }
      } catch (syncError) {
        console.error('Failed to sync isActive status to User model:', syncError);
      }
    }

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (updateVendorStatus):', cacheError);
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Update vendor commission rate
 * @param {String} vendorId - Vendor ID
 * @param {Number} commissionRate - Commission rate (0-1)
 * @returns {Promise<Object>} Updated vendor
 */
export const updateCommissionRate = async (vendorId, commissionRate) => {
  try {
    if (commissionRate < 0 || commissionRate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { commissionRate },
      { new: true, runValidators: true }
    ).lean();

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Toggle vendor active status
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated vendor
 */
export const toggleVendorActive = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    // Sync isActive status with User model
    try {
      const userUpdateResult = await User.updateMany(
        { email: vendor.email },
        { isActive: vendor.isActive }
      );
      if (userUpdateResult.modifiedCount > 0) {
        console.log(`[Sync] Toggled ${userUpdateResult.modifiedCount} user accounts for vendor email: ${vendor.email} to isActive: ${vendor.isActive}`);
      }
    } catch (syncError) {
      console.error('Failed to sync isActive status to User model (toggle):', syncError);
    }

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
      await redisService.clearPattern('home:featured_vendors:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (toggleVendorActive):', cacheError);
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};


/**
 * Get pending vendors
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getPendingVendors = async (filters = {}) => {
  try {
    return getAllVendors({ ...filters, status: 'pending' });
  } catch (error) {
    throw error;
  }
};

/**
 * Get approved vendors
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getApprovedVendors = async (filters = {}) => {
  try {
    return getAllVendors({ ...filters, status: 'approved' });
  } catch (error) {
    throw error;
  }
};

/**
 * Get B2B vendors with subscription information
 * @param {Object} filters - { status, search, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getB2BVendors = async (filters = {}) => {
  try {
    const {
      status,
      search,
      propertyType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query for B2B vendors - ALWAYS filter by vendorType: 'b2b'
    // This is CRITICAL - must only return vendors with vendorType='b2b'
    // Use $and from the start to ensure vendorType filter is NEVER lost
    const baseConditions = [
      { vendorType: 'b2b' }, // STRICT: Only B2B vendors - CRITICAL FILTER
      { isActive: true }, // Only active vendors
    ];

    // Filter by status
    if (status && status !== 'all') {
      baseConditions.push({ status: status });
    }

    // Search filter - add to $and array
    if (search && search.trim()) {
      baseConditions.push({
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { storeName: { $regex: search.trim(), $options: 'i' } },
          { phone: { $regex: search.trim(), $options: 'i' } },
          { gstNumber: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    // Optional filter: vendors having active properties of selected type
    if (propertyType && String(propertyType).trim()) {
      const normalizedType = String(propertyType).trim().toLowerCase();
      let propertyQuery = { isActive: true };

      if (normalizedType !== 'all' && normalizedType !== 'all property types') {
        if (normalizedType === 'all-properties') {
          // any active property (used by admin "All Properties" option)
          propertyQuery = { isActive: true };
        } else {
          const escapedType = String(propertyType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const typeMatchConditions = [
            { propertyType: { $regex: new RegExp(`^${escapedType}$`, 'i') } },
            { propertyTypes: { $elemMatch: { $regex: new RegExp(`^${escapedType}$`, 'i') } } },
          ];

          // Compatibility with older/newer record shapes:
          // look for concrete nested values instead of object existence only.
          if (normalizedType === 'flat') {
            typeMatchConditions.push(
              { 'flatDetails.flatType': { $exists: true, $ne: '' } },
              { 'flatDetails.carpetArea': { $exists: true, $ne: null } }
            );
          }
          if (normalizedType === 'plot' || normalizedType === 'villa') {
            typeMatchConditions.push(
              { 'plotDetails.floors': { $exists: true, $ne: '' } },
              { 'plotDetails.plotArea': { $exists: true, $ne: null } }
            );
          }

          propertyQuery = {
            isActive: true,
            $or: typeMatchConditions,
          };
        }
      }

      const matchingVendorIds = await Property.distinct('vendorId', propertyQuery);

      if (!matchingVendorIds.length) {
        return {
          vendors: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }

      baseConditions.push({ _id: { $in: matchingVendorIds } });
    }

    // Build final query with $and to ensure ALL conditions are met
    const query = { $and: baseConditions };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Log query for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 B2B Vendors Query:', JSON.stringify(query, null, 2));
      console.log('🔍 Expected: Only vendors with vendorType="b2b"');
    }

    // Execute query with subscription population (including payment details)
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate({
          path: 'currentSubscription',
          select: 'status startDate endDate planId razorpayOrderId razorpayPaymentId razorpaySignature paymentMethod lastPaymentDate nextBillingDate',
          populate: {
            path: 'planId',
            select: 'name duration price features',
            model: 'B2BSubscriptionPlan', // Explicitly specify model
          },
          options: { strictPopulate: false }, // Allow null subscriptions
        })
        .populate({
          path: 'businessTypeRef',
          select: 'name',
          model: 'BusinessType'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .catch(err => {
          console.error('Error fetching vendors:', err);
          throw err;
        }),
      Vendor.countDocuments(query).catch(err => {
        console.error('Error counting vendors:', err);
        throw err;
      }),
    ]);

    // CRITICAL: Post-filter to ensure ONLY B2B vendors are returned
    // This is a safety check in case any vendors slipped through the query
    const verifiedB2BVendors = vendors.filter(vendor => {
      // Get vendorType - handle both lean objects and Mongoose documents
      let vendorType;
      if (vendor.toObject) {
        const vendorObj = vendor.toObject();
        vendorType = vendorObj.vendorType;
      } else {
        vendorType = vendor.vendorType;
      }

      // STRICT: Only return vendors with vendorType='b2b' (exact string match)
      // Reject if vendorType is undefined, null, or anything other than 'b2b'
      const isB2B = vendorType === 'b2b';
      const isActive = vendor.isActive === true;

      // Log rejected vendors for debugging
      if (!isB2B) {
        console.warn(`⚠️ REJECTED non-B2B vendor from B2B list:`, {
          email: vendor.email,
          storeName: vendor.storeName,
          vendorType: vendorType,
          expected: 'b2b'
        });
      }

      return isB2B && isActive;
    });

    // Log if any vendors were filtered out (indicates data inconsistency)
    if (vendors.length !== verifiedB2BVendors.length) {
      console.warn(`⚠️ WARNING: Filtered out ${vendors.length - verifiedB2BVendors.length} non-B2B vendors from B2B vendor list`);
      console.warn(`⚠️ Original count: ${vendors.length}, Filtered count: ${verifiedB2BVendors.length}`);

      // Log all rejected vendors for debugging
      vendors.forEach(vendor => {
        const vendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
        if (vendorType !== 'b2b') {
          console.warn(`  - Rejected: ${vendor.email} (vendorType: ${vendorType})`);
        }
      });
    }

    // Get product counts for all vendors using a SINGLE aggregation query (N+1 fix)
    const vendorIds = verifiedB2BVendors.map(v => v._id);

    // Use aggregation to count products for ALL vendors in one query
    const productCountsAgg = await Product.aggregate([
      { $match: { vendorId: { $in: vendorIds }, isActive: true } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } }
    ]);

    // Create a map for quick lookup
    const productCountMap = new Map();
    productCountsAgg.forEach(({ _id, count }) => {
      productCountMap.set(_id.toString(), count);
    });

    // Use aggregation to count followers for ALL vendors in one query
    const followerCountsAgg = await VendorFollow.aggregate([
      { $match: { vendorId: { $in: vendorIds } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } }
    ]);

    // Create a map for quick lookup
    const followerCountMap = new Map();
    followerCountsAgg.forEach(({ _id, count }) => {
      followerCountMap.set(_id.toString(), count);
    });

    // Format vendors for admin panel - use verified B2B vendors only
    // FINAL CHECK: Verify vendorType one more time before formatting
    const formattedVendors = verifiedB2BVendors
      .filter(vendor => {
        // Triple-check: Ensure vendorType is 'b2b'
        const vendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
        if (vendorType !== 'b2b') {
          console.error(`❌ CRITICAL: Non-B2B vendor passed through filters: ${vendor.email}, vendorType: ${vendorType}`);
          return false;
        }
        return true;
      })
      .map(vendor => {
        try {
          // Safely access subscription data
          const subscription = vendor.currentSubscription;
          const plan = subscription?.planId;

          // Final vendorType check - if it's not 'b2b', exclude it
          const finalVendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
          if (finalVendorType !== 'b2b') {
            console.error(`❌ CRITICAL: Non-B2B vendor in formatting: ${vendor.email}`);
            return null; // Return null to filter out later
          }

          return {
            _id: vendor._id,
            id: vendor._id.toString(),
            name: vendor.name || 'N/A',
            companyName: vendor.storeName || vendor.name || 'N/A',
            email: vendor.email || 'N/A',
            phone: vendor.phone || 'N/A',
            status: vendor.status || 'pending',
            isActive: vendor.isActive !== undefined ? vendor.isActive : true,
            products: productCountMap.get(vendor._id.toString()) || 0,
            followerCount: followerCountMap.get(vendor._id.toString()) || 0,
            joinDate: vendor.createdAt ? new Date(vendor.createdAt).toISOString().split('T')[0] : null,
            gstNumber: vendor.gstNumber || 'N/A',
            businessType: vendor.businessType || 'N/A',
            businessTypeRef: vendor.businessTypeRef || null,
            businessTypes: vendor.businessTypes || [],
            subscription: subscription
              ? {
                _id: subscription._id,
                name: plan?.name || 'N/A',
                price: plan?.price || 0,
                duration: plan?.duration || 0,
                status: subscription.status || 'N/A',
                startDate: subscription.startDate
                  ? new Date(subscription.startDate).toISOString().split('T')[0]
                  : null,
                endDate: subscription.endDate
                  ? new Date(subscription.endDate).toISOString().split('T')[0]
                  : null,
                paymentMethod: subscription.paymentMethod || 'N/A',
                razorpayOrderId: subscription.razorpayOrderId || null,
                razorpayPaymentId: subscription.razorpayPaymentId || null,
                razorpaySignature: subscription.razorpaySignature || null,
                lastPaymentDate: subscription.lastPaymentDate
                  ? new Date(subscription.lastPaymentDate).toISOString().split('T')[0]
                  : null,
                nextBillingDate: subscription.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toISOString().split('T')[0]
                  : null,
              }
              : null,
            address: {
              street: vendor.address?.street || '',
              area: vendor.address?.area || '',
              landmark: vendor.address?.landmark || '',
              city: (vendor.address?.city || '').replace(/\s+\d{6}$/, '').trim(),
              state: (vendor.address?.state || '').replace(/\s+\d{6}$/, '').trim(),
              pincode: (function () {
                const addr = vendor.address || {};
                // 1. Try direct fields first
                const directPin = addr.pincode || addr.zipCode || addr.pinCode || addr.pincode;
                if (directPin && /^\d{5,6}$/.test(String(directPin).trim())) return String(directPin).trim();

                // 2. Try to extract 6-digit pincode from state, city, or street if direct fields are missing
                const searchFields = [addr.state, addr.city, addr.street, addr.landmark];
                for (const field of searchFields) {
                  const match = String(field || '').match(/\d{6}/);
                  if (match) return match[0];
                }
                return directPin || ''; // Return whatever was in direct fields if no 6-digit match elsewhere
              })(),
              country: vendor.address?.country || 'India',
              market: vendor.address?.market || '',
            },
            rawAddress: vendor.address, // For debugging in logs
            documents: Array.isArray(vendor.documents) ? vendor.documents : [],
            vendorType: 'b2b', // Explicitly set to ensure it's B2B
          };
        } catch (error) {
          console.error('Error formatting vendor:', vendor._id, error);
          // Return minimal vendor data if formatting fails
          return {
            _id: vendor._id,
            id: vendor._id?.toString() || 'N/A',
            name: vendor.name || 'N/A',
            companyName: vendor.storeName || 'N/A',
            email: vendor.email || 'N/A',
            phone: vendor.phone || 'N/A',
            status: vendor.status || 'Unknown',
            products: 0,
            joinDate: null,
            gstNumber: 'N/A',
            businessTypes: [],
            subscription: null,
            address: {
              ...(vendor.address || {}),
              pincode: vendor.address?.pincode || vendor.address?.zipCode || '',
            },
            documents: [],
          };
        }
      })
      .filter(vendor => vendor !== null); // Remove any null entries from formatting errors

    // Debug log for pincode investigation
    console.log(`📡 Returning ${formattedVendors.length} B2B vendors. Samples:`,
      formattedVendors.slice(0, 3).map(v => ({ email: v.email, pincode: v.address?.pincode, hasRawAddress: !!v.rawAddress }))
    );
    const verifiedTotal = formattedVendors.length;
    const totalPages = Math.ceil(verifiedTotal / parseInt(limit));

    return {
      vendors: formattedVendors,
      total: verifiedTotal, // Use verified count, not raw query count
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    console.error('Error in getB2BVendors service:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
};

/**
 * Delete B2B Vendor
 * @param {String} vendorId - Vendor ID to delete
 * @returns {Promise<Boolean>} True if deleted successfully
 */
export const deleteB2BVendor = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error('B2B Vendor not found');
    }

    // Ensure it is a B2B vendor
    if (vendor.vendorType !== 'b2b') {
      throw new Error('Cannot delete non-B2B vendor through this endpoint');
    }

    // Optional: Delete associated products (can be done via middleware/hooks too)
    await Product.deleteMany({ vendorId: vendor._id });

    // Delete the vendor
    await Vendor.findByIdAndDelete(vendorId);

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
      await redisService.clearPattern('admin:vendors:list:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (deleteB2BVendor):', cacheError);
    }

    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};
