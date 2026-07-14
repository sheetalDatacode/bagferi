import * as adminB2BAnalyticsService from '../services/adminB2BAnalytics.service.js';

/**
 * Get Admin B2B Vendor Analytics
 * GET /api/admin/analytics/b2b-vendors
 */
export const getB2BVendorAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    const analyticsData = await adminB2BAnalyticsService.getAdminB2BAnalytics(period);

    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Error in getB2BVendorAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch B2B vendor analytics',
      error: error.message
    });
  }
};
