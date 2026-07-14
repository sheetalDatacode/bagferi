import api from '../utils/api';

/**
 * Admin Analytics APIs
 */
export const getAdminAnalyticsSummary = async (period = 'month') => {
  return await api.get(`/admin/analytics/summary?period=${period}`);
};

export const getAdminChartData = async (period = 'month') => {
  return await api.get(`/admin/analytics/charts?period=${period}`);
};

export const getAdminFinanceSummary = async (period = 'month') => {
  return await api.get(`/admin/analytics/finance?period=${period}`);
};

export const getOrderTrends = async (period = 'month') => {
  return await api.get(`/admin/analytics/trends?period=${period}`);
};

export const getPaymentBreakdown = async (period = 'month') => {
  return await api.get(`/admin/analytics/payment-breakdown?period=${period}`);
};

export const getTaxReports = async (period = 'month') => {
  return await api.get(`/admin/analytics/tax-reports?period=${period}`);
};

export const getRefundReports = async (period = 'month') => {
  return await api.get(`/admin/analytics/refund-reports?period=${period}`);
};

/**
 * Vendor Analytics APIs
 */
export const getVendorAnalyticsSummary = async (period = 'month') => {
  return await api.get(`/vendor/analytics/summary?period=${period}`);
};

export const getVendorChartData = async (period = 'month') => {
  return await api.get(`/vendor/analytics/charts?period=${period}`);
};

/**
 * Get vendor dashboard data
 * @param {string} period 
 */
export const getVendorDashboardData = async (period = 'month') => {
  return await api.get(`/vendor/analytics/dashboard?period=${period}`);
};
