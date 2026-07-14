import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Hook to fetch and cache admin dashboard summary
 * @param {string} period - 'week', 'month', 'year'
 * @returns {Object} { data, isLoading, error, refetch }
 */
export const useDashboardSummary = (period = 'month') => {
  return useQuery({
    queryKey: ['admin', 'dashboard-summary', period],
    queryFn: async () => {
      const response = await api.get(`/admin/reports/dashboard-summary?period=${period}`);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch and cache vendor analytics
 * @param {string} vendorId 
 * @returns {Object} { data, isLoading, error }
 */
export const useVendorAnalytics = (vendorId = null) => {
  return useQuery({
    queryKey: ['admin', 'vendor-analytics', vendorId],
    queryFn: async () => {
      const url = vendorId
        ? `/admin/vendors/analytics/${vendorId}`
        : '/admin/vendors/analytics';
      const response = await api.get(url);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch and cache admin analytics summary
 * @param {string} period 
 * @returns {Object}
 */
export const useAdminAnalyticsSummary = (period = 'month') => {
  return useQuery({
    queryKey: ['admin', 'analytics-summary', period],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/summary?period=${period}`);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch and cache admin chart data
 * @param {string} period 
 * @returns {Object}
 */
export const useAdminChartData = (period = 'month') => {
  return useQuery({
    queryKey: ['admin', 'chart-data', period],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/chart?period=${period}`);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch and cache sales report
 * @param {Object} dateRange { start, end }
 * @returns {Object}
 */
export const useSalesReport = (dateRange = { start: '', end: '' }) => {
  return useQuery({
    queryKey: ['admin', 'sales-report', dateRange],
    queryFn: async () => {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const response = await api.get('/admin/reports/sales', { params });
      return response.data || response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch and cache inventory report
 * @returns {Object}
 */
export const useInventoryReport = () => {
  return useQuery({
    queryKey: ['admin', 'inventory-report'],
    queryFn: async () => {
      const response = await api.get('/admin/reports/inventory');
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
