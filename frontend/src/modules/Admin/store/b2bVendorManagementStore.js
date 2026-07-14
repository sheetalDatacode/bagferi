import { create } from 'zustand';
import api from '../../../shared/utils/api';

export const useB2BVendorManagementStore = create((set, get) => ({
  b2bVendors: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 1,

  fetchB2BVendors: async (filters = {}) => {
    set({ isLoading: true, error: null });
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

      const response = await api.get(`/admin/b2b-vendors?${params.toString()}`);

      if (response.success && response.data) {
        set({
          b2bVendors: response.data.vendors || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          totalPages: response.data.totalPages || 1,
          isLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch B2B vendors');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch B2B vendors';
      set({
        isLoading: false,
        error: errorMessage,
        b2bVendors: [],
      });
      throw error;
    }
  },

  getB2BVendorById: async (id) => {
    try {
      const response = await api.get(`/admin/b2b-vendors/${id}`);
      if (response.success && response.data) {
        return response.data.vendor;
      }
      throw new Error(response.message || 'Failed to fetch B2B vendor');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch B2B vendor';
      throw new Error(errorMessage);
    }
  },

  deleteB2BVendor: async (id) => {
    try {
      const response = await api.delete(`/admin/b2b-vendors/${id}`);
      if (response.success) {
        set((state) => ({
          b2bVendors: state.b2bVendors.filter((vendor) => (vendor._id || vendor.id) !== id),
          total: state.total - 1,
        }));
        return true;
      }
      throw new Error(response.message || 'Failed to delete B2B vendor');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete B2B vendor';
      throw new Error(errorMessage);
    }
  },

  // Toggle active/inactive status
  toggleB2BVendorActive: async (id) => {
    try {
      const response = await api.patch(`/admin/b2b-vendors/${id}/toggle-active`);
      if (response.success && response.data) {
        const updatedVendor = response.data.vendor || response.data;
        set((state) => ({
          b2bVendors: state.b2bVendors.map((v) => ((v._id || v.id) === id ? { ...v, isActive: updatedVendor.isActive, status: updatedVendor.status } : v)),
        }));
        return updatedVendor;
      }
      throw new Error(response.message || 'Failed to toggle active status');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to toggle active status';
      throw new Error(errorMessage);
    }
  },

  // Update explicit status for B2B vendor
  updateB2BVendorStatus: async (id, status) => {
    try {
      const response = await api.put(`/admin/b2b-vendors/${id}/status`, { status });
      if (response.success && response.data) {
        const updatedVendor = response.data.vendor || response.data;
        set((state) => ({
          b2bVendors: state.b2bVendors.map((v) => ((v._id || v.id) === id ? updatedVendor : v)),
        }));
        return updatedVendor;
      }
      throw new Error(response.message || 'Failed to update status');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update status';
      throw new Error(errorMessage);
    }
  },

  // Robust active setter with endpoint fallback
  setB2BVendorActive: async (id, nextActive) => {
    try {
      const response = await api.put(`/admin/vendors/${id}/status`, { isActive: nextActive });
      if (response?.success && response?.data) {
        const updatedVendor = response.data.vendor || response.data;
        set((state) => ({
          b2bVendors: state.b2bVendors.map((v) => ((v._id || v.id) === id ? { ...v, isActive: updatedVendor.isActive } : v)),
        }));
        return updatedVendor;
      }
      throw new Error(response?.message || 'Failed to update active status');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update active status';
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
