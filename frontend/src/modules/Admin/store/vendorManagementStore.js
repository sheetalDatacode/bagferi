import { create } from 'zustand';
import api from '../../../shared/utils/api';

export const useVendorManagementStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,
  isLoading: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  // Fetch all vendors
  fetchVendors: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const {
        status = 'all',
        search = '',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const params = new URLSearchParams({
        status,
        search,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      const response = await api.get(`/admin/vendors?${params.toString()}`);

      if (response.success && response.data) {
        const transformedVendors = response.data.vendors.map((vendor) =>
          transformVendor(vendor)
        );

        set({
          vendors: transformedVendors,
          pagination: {
            page: response.data.page,
            limit: response.data.limit,
            total: response.data.total,
            totalPages: response.data.totalPages,
          },
          isLoading: false,
        });

        return transformedVendors;
      } else {
        throw new Error(response.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch pending vendors
  fetchPendingVendors: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const { search = '', page = 1, limit = 10 } = filters;

      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`/admin/vendors/pending?${params.toString()}`);

      if (response.success && response.data) {
        const transformedVendors = response.data.vendors.map((vendor) =>
          transformVendor(vendor)
        );

        set({
          vendors: transformedVendors,
          pagination: {
            page: response.data.page,
            limit: response.data.limit,
            total: response.data.total,
            totalPages: response.data.totalPages,
          },
          isLoading: false,
        });

        return transformedVendors;
      } else {
        throw new Error(response.message || 'Failed to fetch pending vendors');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch vendor by ID
  fetchVendorById: async (vendorId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/admin/vendors/${vendorId}`);

      if (response.success && response.data) {
        const vendor = transformVendor(response.data.vendor);
        set({ selectedVendor: vendor, isLoading: false });
        return vendor;
      } else {
        throw new Error(response.message || 'Failed to fetch vendor');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Update vendor status
  updateVendorStatus: async (vendorId, status, reason = null) => {
    set({ isLoading: true });
    try {
      const response = await api.put(`/admin/vendors/${vendorId}/status`, {
        status,
        reason,
      });

      if (response.success && response.data) {
        const updatedVendor = transformVendor(response.data.vendor);

        // Update in vendors list
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? updatedVendor : v
          ),
          selectedVendor:
            state.selectedVendor?.id === vendorId
              ? updatedVendor
              : state.selectedVendor,
          isLoading: false,
        }));

        return updatedVendor;
      } else {
        throw new Error(response.message || 'Failed to update vendor status');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Update commission rate
  updateCommissionRate: async (vendorId, commissionRate) => {
    set({ isLoading: true });
    try {
      const response = await api.put(`/admin/vendors/${vendorId}/commission`, {
        commissionRate,
      });

      if (response.success && response.data) {
        const updatedVendor = transformVendor(response.data.vendor);

        // Update in vendors list
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? updatedVendor : v
          ),
          selectedVendor:
            state.selectedVendor?.id === vendorId
              ? updatedVendor
              : state.selectedVendor,
          isLoading: false,
        }));

        return updatedVendor;
      } else {
        throw new Error(response.message || 'Failed to update commission rate');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Toggle vendor active status
  toggleVendorActive: async (vendorId) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/admin/vendors/${vendorId}/toggle-active`);

      if (response.success && response.data) {
        const updatedVendor = transformVendor(response.data.vendor);

        // Update in vendors list
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? updatedVendor : v
          ),
          selectedVendor:
            state.selectedVendor?.id === vendorId
              ? updatedVendor
              : state.selectedVendor,
          isLoading: false,
        }));

        return updatedVendor;
      } else {
        throw new Error(response.message || 'Failed to toggle vendor active status');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },


  // Fetch vendor analytics
  fetchVendorAnalytics: async (vendorId = null) => {
    set({ isLoading: true });
    try {
      const url = vendorId
        ? `/admin/vendors/analytics/${vendorId}`
        : '/admin/vendors/analytics';

      const response = await api.get(url);

      if (response.success && response.data) {
        set({ isLoading: false });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch vendor registration analytics (admin dashboard)
  fetchVendorRegistrationAnalytics: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const { type, date, startDate, endDate } = filters;
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (date) params.append('date', date);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/reports/vendor-registration-analytics?${params.toString()}`);

      if (response.success) {
        set({ isLoading: false });
        return response;
      } else {
        throw new Error(response.message || 'Failed to fetch vendor registration analytics');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch vendor orders
  fetchVendorOrders: async (vendorId, filters = {}) => {
    set({ isLoading: true });
    try {
      const { page = 1, limit = 10, status } = filters;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      const response = await api.get(
        `/admin/vendors/${vendorId}/orders?${params.toString()}`
      );

      if (response.success && response.data) {
        set({ isLoading: false });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch vendor orders');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Clear selected vendor
  clearSelectedVendor: () => {
    set({ selectedVendor: null });
  },
}));

// Transform backend vendor to frontend format
const transformVendor = (vendor) => {
  return {
    id: vendor._id || vendor.id,
    _id: vendor._id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone || '',
    storeName: vendor.storeName,
    storeDescription: vendor.storeDescription || '',
    storeLogo: vendor.storeLogo || null,
    status: vendor.status,
    isEmailVerified: vendor.isEmailVerified || false,
    isActive: vendor.isActive !== false,
    role: vendor.role || 'vendor',
    address: vendor.address || {},
    documents: Array.isArray(vendor.documents) ? vendor.documents : [], // Handle as array
    bankDetails: vendor.bankDetails || {},
    commissionRate: vendor.commissionRate || 0.1,
    joinDate: vendor.createdAt || vendor.joinDate || new Date().toISOString(),
    performance: vendor.performance || { totalOrders: 0, totalEarnings: 0 },
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
};

