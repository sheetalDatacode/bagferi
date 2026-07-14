import { getPublicProducts, getPublicProductById, getB2BSearchSuggestions } from '../services/publicProduct.service.js';

/**
 * Get all public products with filters
 * GET /api/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      search = '',
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      vendorId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      excludeBusinessTypes,
      vendorType = 'b2b',
      state,
      city,
      itemType,
      area,
      market,
      businessType,
      businessCategory,
      strict,
      dynamicFilters
    } = req.query;

    const result = await getPublicProducts({
      search,
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      vendorId,
      page,
      limit,
      sortBy,
      sortOrder,
      excludeBusinessTypes,
      vendorType,
      state,
      city,
      itemType,
      area,
      market,
      businessType,
      businessCategory,
      strict,
      dynamicFilters
    });

    // Enrich products with vendor enquiry status
    if (result.products && result.products.length > 0) {
      const vendorIds = [...new Set(result.products.map(p => {
          const vid = p.vendorId?._id || p.vendorId?.id || p.vendorId;
          return vid ? vid.toString() : null;
      }).filter(Boolean))];

      const enquiryStatuses = await Promise.all(
          vendorIds.map(id => subscriptionRulesService.getVendorEnquiryStatus(id))
      );

      const statusMap = new Map(vendorIds.map((id, index) => [id, enquiryStatuses[index]]));

      result.products = result.products.map(p => {
          const vid = (p.vendorId?._id || p.vendorId?.id || p.vendorId)?.toString();
          return {
              ...p,
              enquiryStatus: statusMap.get(vid) || { canAcceptEnquiries: false, reason: 'UNKNOWN' }
          };
      });
    }

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

import subscriptionRulesService from '../services/subscriptionRules.service.js';

/**
 * Get public product by ID
 * GET /api/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await getPublicProductById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const enquiryStatus = await subscriptionRulesService.getVendorEnquiryStatus(product.vendorId._id || product.vendorId);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: { 
        product,
        enquiryStatus // { canAcceptEnquiries, reason, message }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get B2B search suggestions
 * GET /api/products/b2b-suggestions
 */
export const getB2BSuggestions = async (req, res, next) => {
  try {
    const { q = '', vendorId } = req.query;
    const suggestions = await getB2BSearchSuggestions(q, vendorId);
    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

