import { getApprovedVendors, getVendorById } from '../services/vendorManagement.service.js';
import Product from '../models/Product.model.js';
import redisService from '../services/redis.service.js';
import { getRatingSummaries, getRatingSummary } from '../services/rating.service.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';

/**
 * Get all approved B2B vendors (public endpoint)
 * GET /api/vendors
 */
export const getPublicVendors = async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      businessType,
      excludeBusinessTypes,
      dynamicFilters,
      strict,
      nocache,
      city
    } = req.query;

    const useCache = !(nocache === '1' || nocache === 'true');
    const cacheQuery = { ...req.query }; delete cacheQuery.nocache;
    const cacheKey = `vendors:list:b2b:${JSON.stringify(cacheQuery)}`;

    if (useCache) {
      try {
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) return res.status(200).json({
          success: true,
          message: 'Vendors retrieved successfully (cached)',
          data: cachedData,
        });
      } catch (cacheError) {
        console.error('Redis GET error (getPublicVendors):', cacheError);
      }
    }

    // Get approved and active B2B vendors
    const result = await getApprovedVendors({
      search,
      vendorType: 'b2b',
      isActive: true, // Only show active vendors
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      businessType,
      excludeBusinessTypes,
      dynamicFilters,
      strict,
      city: city || undefined
    });// OPTIMIZED: Get product counts and shop units for all vendors in a single query each
    const vendorIds = result.vendors.map(v => v._id);
    const ShopUnit = (await import('../models/ShopUnit.model.js')).default;

    const [productCounts, shopUnits, activeSubscriptions, enquiryStatuses] = await Promise.all([
      Product.aggregate([
        { $match: { vendorId: { $in: vendorIds }, isActive: true } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } }
      ]),
      ShopUnit.find({ vendorId: { $in: vendorIds } }).lean(),
      (await import('../models/VendorSubscription.model.js')).default.find({
        vendorId: { $in: vendorIds },
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId').lean(),
      Promise.all(vendorIds.map(id => subscriptionRulesService.getVendorEnquiryStatus(id.toString())))
    ]);

    // Create maps for O(1) lookup
    const productCountMap = new Map(productCounts.map(item => [item._id.toString(), item.count]));
    const shopUnitMap = new Map(shopUnits.map(unit => [unit.vendorId.toString(), unit]));
    const subscriptionMap = new Map(activeSubscriptions.map(sub => [sub.vendorId.toString(), sub]));
    const enquiryStatusMap = new Map(vendorIds.map((id, index) => [id.toString(), enquiryStatuses[index]]));

    // Shop ratings (targetType 'shop', targetId = vendorId)
    const ratingMap = vendorIds.length > 0
      ? await getRatingSummaries('shop', vendorIds)
      : {};

    // Enrich vendors with product counts, shop units, and rating
    const enrichedVendors = result.vendors.map((vendor) => {
      const productCount = productCountMap.get(vendor._id.toString()) || 0;
      const shopUnit = shopUnitMap.get(vendor._id.toString());
      const idStr = vendor._id.toString();
      const ratingSummary = ratingMap[idStr];

      // Transform vendor data for public consumption
      return {
        id: vendor._id.toString(),
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        storeName: shopUnit?.name || vendor.storeName,
        storeLogo: vendor.storeLogo,
        storeDescription: shopUnit?.description || vendor.storeDescription,
        address: vendor.address,
        status: vendor.status,
        businessType: vendor.businessType || 'N/A',
        mfgOfWork: vendor.mfgOfWork || '',
        gstNumber: vendor.gstNumber || '',
        isVerified: vendor.isEmailVerified || vendor.status === 'approved',
        totalProducts: productCount,
        minPrice: shopUnit?.minPrice,
        maxPrice: shopUnit?.maxPrice,
        shopUnit: shopUnit ? {
            ...shopUnit,
            images: (subscriptionMap.get(idStr)?.planId?.shopSlideshow) 
                ? shopUnit.images 
                : (shopUnit.images && shopUnit.images.length > 0 ? [shopUnit.images[0]] : [])
        } : null,
        averageRating: ratingSummary?.averageRating ?? 0,
        ratingCount: ratingSummary?.ratingCount ?? 0,
        hasSlideshow: !!subscriptionMap.get(idStr)?.planId?.shopSlideshow,
        enquiryStatus: enquiryStatusMap.get(idStr) || { canAcceptEnquiries: false },
        joinDate: vendor.createdAt,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
    });

    const responseData = {
      vendors: enrichedVendors,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };

    // Cache the result for 10 minutes (skip when nocache requested)
    if (useCache) {
      try {
        await redisService.set(cacheKey, responseData, 600);
      } catch (cacheError) {
        console.error('Redis SET error (getPublicVendors):', cacheError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'B2B vendors retrieved successfully',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single vendor details (public endpoint) (B2B-ONLY)
 * GET /api/vendors/:id
 */
export const getPublicVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cacheKey = `vendor:details:${id}`;
    try {
      const cachedVendor = await redisService.get(cacheKey);
      if (cachedVendor) {
        // Increment vendor views in Redis with 24h TTL
        await redisService.incrWithExpire(`vendor:views:${id}`, 86400);
        return res.status(200).json({
          success: true,
          message: 'Vendor retrieved successfully (cached)',
          data: { vendor: cachedVendor },
        });
      }
    } catch (cacheError) {
      console.error('Redis GET error (getPublicVendor):', cacheError);
    }
    
    const [vendor, enquiryStatus] = await Promise.all([
      getVendorById(id),
      subscriptionRulesService.getVendorEnquiryStatus(id)
    ]);

    // STRICT CHECK: Ensure it is a B2B vendor
    if (!vendor || vendor.status !== 'approved' || vendor.isActive === false || vendor.vendorType !== 'b2b') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or inactive',
      });
    }

    // Increment vendor views in Redis with 24h TTL (to prevent memory leaks)
    // The cron job will sync these views to MongoDB every 5 minutes
    const viewCount = await redisService.incrWithExpire(`vendor:views:${id}`, 86400);

    // Get product count
    const productCount = await Product.countDocuments({
      vendorId: vendor._id,
      isActive: true,
    });

    // Get shop unit details for B2B vendors
    const ShopUnit = (await import('../models/ShopUnit.model.js')).default;
    const shopUnit = await ShopUnit.findOne({ vendorId: vendor._id }).lean();

    // Check subscription for shop slideshow allowance
    const VendorSubscription = (await import('../models/VendorSubscription.model.js')).default;
    const activeSub = await VendorSubscription.findOne({
      vendorId: vendor._id,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId').lean();

    const canUseSlideshow = activeSub?.planId?.shopSlideshow || false;
    if (shopUnit && !canUseSlideshow && shopUnit.images && shopUnit.images.length > 1) {
      shopUnit.images = [shopUnit.images[0]];
    }

    // Shop rating summary
    const ratingSummary = await getRatingSummary('shop', vendor._id.toString());

    // Transform vendor data for public consumption
    const publicVendor = {
      id: vendor._id.toString(),
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      storeName: vendor.storeName,
      storeLogo: vendor.storeLogo,
      storeDescription: vendor.storeDescription,
      address: vendor.address,
      status: vendor.status,
      businessType: vendor.businessType || 'N/A',
      mfgOfWork: vendor.mfgOfWork || '',
      gstNumber: vendor.gstNumber || '',
      isVerified: vendor.isEmailVerified || vendor.status === 'approved',
      totalProducts: productCount,
      viewCount: parseInt(viewCount) || 0,
      joinDate: vendor.createdAt,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      vendorType: 'b2b',
      shopUnit: shopUnit, // Include shop unit details
      averageRating: ratingSummary.averageRating,
      ratingCount: ratingSummary.ratingCount,
      enquiryStatus: enquiryStatus, // { canAcceptEnquiries, reason, message }
    };

    // Cache the result for 1 hour
    try {
      await redisService.set(cacheKey, publicVendor, 3600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicVendor):', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Vendor retrieved successfully',
      data: { vendor: publicVendor },
    });
  } catch (error) {
    next(error);
  }
};


