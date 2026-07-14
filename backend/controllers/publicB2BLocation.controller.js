import { getB2BAvailableLocations, getB2BListingLocations } from '../services/b2bLocation.service.js';

/**
 * Get available B2B vendor locations
 * GET /api/public/b2b-locations
 */
export const getB2BLocations = async (req, res, next) => {
  try {
    const { businessTypeFilter, businessTypes } = req.query;
    
    const options = {};
    if (businessTypeFilter && businessTypes) {
      options.businessTypeFilter = businessTypeFilter;
      options.businessTypes = Array.isArray(businessTypes) ? businessTypes : businessTypes.split(',');
    }
    
    const locations = await getB2BAvailableLocations(options);

    res.status(200).json({
      success: true,
      message: 'B2B locations retrieved successfully',
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dynamic listing-based location filters (products + properties)
 * GET /api/public/b2b-listing-locations
 */
export const getB2BListingLocationFilters = async (req, res, next) => {
  try {
    const {
      city,
      area,
      market,
      includeProducts = 'true',
      includeProperties = 'true',
      businessTypeFilter,
      businessTypes,
    } = req.query;

    const options = {
      city,
      area,
      market,
      includeProducts: includeProducts !== 'false',
      includeProperties: includeProperties !== 'false',
    };

    if (businessTypeFilter && businessTypes) {
      options.businessTypeFilter = businessTypeFilter;
      options.businessTypes = Array.isArray(businessTypes)
        ? businessTypes
        : String(businessTypes).split(',').map((item) => item.trim()).filter(Boolean);
    }

    const locations = await getB2BListingLocations(options);

    res.status(200).json({
      success: true,
      message: 'Listing-based location filters retrieved successfully',
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};
