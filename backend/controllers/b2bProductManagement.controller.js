import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import { sanitizeImageUrl, sanitizeImageUrls } from '../utils/imageValidation.util.js';
import redisService from '../services/redis.service.js';

/**
 * Helper to clear product-related cache
 */
const clearProductCache = async (productId = null) => {
  try {
    const patterns = [
      'products:list:*',
      'products:recommended:*',
      'public:campaigns:*',
      'campaign:details:*',
      'public:b2b-locations:*',
      'admin:products:list:*',
      'vendor:products:list:*'
    ];

    if (productId) {
      patterns.push(`product:details:*${productId}*`);
      patterns.push(`admin:products:details:*${productId}*`);
      patterns.push(`vendor:products:details:*${productId}*`);
    } else {
      patterns.push('product:details:*');
      patterns.push('admin:products:details:*');
      patterns.push('vendor:products:details:*');
    }

    await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
  } catch (error) {
    console.error('Error clearing product cache:', error);
  }
};

/**
 * Get all B2B products
 * GET /api/admin/b2b-products
 */
export const getB2BProducts = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      category = '',
      subcategory = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query - only products from B2B vendors; exclude item listings
    const query = { isActive: true, formType: { $ne: 'shop-listing' } };

    // Get all B2B vendor IDs - strictly filter by vendorType='b2b'
    // Convert to ObjectId array to ensure proper matching
    const b2bVendors = await Vendor.find({
      vendorType: 'b2b',
      isActive: true,
      status: 'approved' // Only approved B2B vendors
    }).select('_id vendorType');

    // Double check - ensure all vendors are actually B2B
    const verifiedB2BVendors = b2bVendors.filter(v => {
      const vendorType = v.vendorType || (v.toObject && v.toObject().vendorType);
      return vendorType === 'b2b';
    });

    const b2bVendorIds = verifiedB2BVendors.map(v => {
      const id = v._id || v.id;
      return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    }).filter(id => id); // Remove any invalid IDs

    // If no B2B vendors found, return empty result
    if (b2bVendorIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'B2B products retrieved successfully',
        data: {
          products: [],
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }

    // Use $in with ObjectIds for proper MongoDB query
    query.vendorId = { $in: b2bVendorIds };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Subcategory filter
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter (product approval status - using isVisible as status indicator)
    if (status !== 'all') {
      if (status === 'approved') {
        query.isVisible = true;
      } else if (status === 'pending') {
        query.isVisible = false;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query - get products and verify vendor types
    // Optimize: Queries already run in parallel, ensure lean() is used
    const [productsRaw, total] = await Promise.all([
      Product.find(query)
        .populate('vendorId', 'name storeName email vendorType isActive status')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Already has lean() - good!
      Product.countDocuments(query),
    ]);

    // Additional filtering: Ensure populated vendor data is actually B2B
    // This catches any cases where vendorType might have been changed or products incorrectly linked
    const products = productsRaw.filter(product => {
      const vendor = product.vendorId;
      // If vendor is populated, verify it's B2B
      if (vendor && typeof vendor === 'object' && vendor.vendorType !== undefined) {
        return vendor.vendorType === 'b2b' && vendor.isActive === true && vendor.status === 'approved';
      }
      // If vendor is just an ID, check if it's in our B2B vendor list
      const vendorId = typeof vendor === 'object' ? (vendor._id || vendor.id) : vendor;
      if (vendorId) {
        return b2bVendorIds.some(id => id.toString() === vendorId.toString());
      }
      return false;
    });

    // Recalculate total based on filtered products
    // Since we're filtering post-query, we need to get accurate count
    const filteredTotal = products.length;
    const totalPages = Math.ceil(filteredTotal / parseInt(limit));

    // Sanitize product images and format for admin
    const formattedProducts = products.map(product => {
      // Direct access from product model fields with fallback to attributes for legacy products
      const categoryAttr = product.attributes?.find(attr => attr.name === 'category' || attr.attributeName === 'category');
      const category = product.category || categoryAttr?.value || '';

      const subcategoryAttr = product.attributes?.find(attr => attr.name === 'subcategory' || attr.attributeName === 'subcategory');
      const subcategory = product.subcategory || subcategoryAttr?.value || '';

      // Extract MOQ
      const moq = product.minimumOrderQuantity || 0;

      // Determine status
      const productStatus = product.isVisible ? 'Approved' : 'Pending';

      const price = product.price ? `₹${product.price}` : 'N/A';

      return {
        _id: product._id,
        title: product.name,
        name: product.name,
        b2bVendor: product.vendorName || (product.vendorId && product.vendorId.storeName) || 'N/A',
        vendorId: product.vendorId?._id || product.vendorId,
        price,
        moq,
        category,
        subcategory,
        status: productStatus,
        isVisible: product.isVisible,
        image: sanitizeImageUrl(product.image),
        images: sanitizeImageUrls(product.images || []),
        description: product.description,
        formType: 'standard',
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      message: 'B2B products retrieved successfully',
      data: {
        products: formattedProducts,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTotal,
        pages: totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get B2B product by ID
 * GET /api/admin/b2b-products/:id
 */
export const getB2BProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify product belongs to B2B vendor
    const product = await Product.findById(id)
      .populate('vendorId', 'name storeName email vendorType')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify vendor is B2B
    const vendor = await Vendor.findById(product.vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(400).json({
        success: false,
        message: 'This product does not belong to a B2B vendor',
      });
    }

    // Sanitize images
    product.image = sanitizeImageUrl(product.image);
    product.images = sanitizeImageUrls(product.images || []);

    res.status(200).json({
      success: true,
      message: 'B2B product retrieved successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update B2B product status (approve/reject)
 * PATCH /api/admin/b2b-products/:id/status
 */
export const updateB2BProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"',
      });
    }

    // Find product
    const product = await Product.findById(id).populate('vendorId');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify vendor is B2B
    if (!product.vendorId || product.vendorId.vendorType !== 'b2b') {
      return res.status(400).json({
        success: false,
        message: 'This product does not belong to a B2B vendor',
      });
    }

    // Update status
    product.isVisible = status === 'approved';

    await product.save();

    // Clear cache
    await clearProductCache(id);

    res.status(200).json({
      success: true,
      message: `Product ${status} successfully`,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};
