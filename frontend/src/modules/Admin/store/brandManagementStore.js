import { create } from 'zustand';
import api from '../../../shared/utils/api';

export const useBrandManagementStore = create((set, get) => ({
  brands: [],
  selectedBrand: null,
  isLoading: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  // Fetch all brands
  fetchBrands: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const {
        search = '',
        isActive,
        page = 1,
        limit = 100, // Get all for now, can implement pagination later
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (isActive !== undefined && isActive !== null) {
        params.append('isActive', isActive.toString());
      }

      const response = await api.get(`/admin/brands?${params.toString()}`);

      if (response.success && response.data) {
        const transformedBrands = response.data.brands.map((brand) =>
          transformBrand(brand)
        );

        set({
          brands: transformedBrands,
          pagination: {
            page: response.data.page,
            limit: response.data.limit,
            total: response.data.total,
            totalPages: response.data.totalPages,
          },
          isLoading: false,
        });

        return transformedBrands;
      } else {
        throw new Error(response.message || 'Failed to fetch brands');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch brand by ID
  fetchBrandById: async (brandId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/admin/brands/${brandId}`);

      if (response.success && response.data) {
        const brand = transformBrand(response.data.brand);
        set({ selectedBrand: brand, isLoading: false });
        return brand;
      } else {
        throw new Error(response.message || 'Failed to fetch brand');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Create brand
  createBrand: async (brandData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/admin/brands', brandData);

      if (response.success && response.data) {
        const newBrand = transformBrand(response.data.brand);
        set((state) => ({
          brands: [...state.brands, newBrand],
          isLoading: false,
        }));
        
        // Refresh shared brandStore for user/vendor side
        try {
          // Dynamically import to avoid circular dependency
          const { useBrandStore } = await import('../../../shared/store/brandStore');
          const brandStore = useBrandStore.getState();
          if (brandStore.refreshBrands) {
            await brandStore.refreshBrands();
          }
        } catch (err) {
          console.error('Error refreshing shared brand store:', err);
        }
        
        return newBrand;
      } else {
        throw new Error(response.message || 'Failed to create brand');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Update brand
  updateBrand: async (brandId, brandData) => {
    set({ isLoading: true });
    try {
      const response = await api.put(`/admin/brands/${brandId}`, brandData);

      if (response.success && response.data) {
        const updatedBrand = transformBrand(response.data.brand);

        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId ? updatedBrand : b
          ),
          selectedBrand:
            state.selectedBrand?.id === brandId
              ? updatedBrand
              : state.selectedBrand,
          isLoading: false,
        }));

        // Refresh shared brandStore for user/vendor side
        try {
          // Dynamically import to avoid circular dependency
          const { useBrandStore } = await import('../../../shared/store/brandStore');
          const brandStore = useBrandStore.getState();
          if (brandStore.refreshBrands) {
            await brandStore.refreshBrands();
          }
        } catch (err) {
          console.error('Error refreshing shared brand store:', err);
        }

        return updatedBrand;
      } else {
        throw new Error(response.message || 'Failed to update brand');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Delete brand
  deleteBrand: async (brandId) => {
    set({ isLoading: true });
    try {
      const response = await api.delete(`/admin/brands/${brandId}`);

      if (response.success) {
        set((state) => ({
          brands: state.brands.filter((b) => b.id !== brandId),
          selectedBrand:
            state.selectedBrand?.id === brandId ? null : state.selectedBrand,
          isLoading: false,
        }));

        // Refresh shared brandStore for user/vendor side
        try {
          // Dynamically import to avoid circular dependency
          const { useBrandStore } = await import('../../../shared/store/brandStore');
          const brandStore = useBrandStore.getState();
          if (brandStore.refreshBrands) {
            await brandStore.refreshBrands();
          }
        } catch (err) {
          console.error('Error refreshing shared brand store:', err);
        }

        return true;
      } else {
        throw new Error(response.message || 'Failed to delete brand');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Bulk delete brands
  bulkDeleteBrands: async (brandIds) => {
    set({ isLoading: true });
    try {
      const response = await api.delete('/admin/brands/bulk', {
        data: { ids: brandIds },
      });

      if (response.success) {
        set((state) => ({
          brands: state.brands.filter((b) => !brandIds.includes(b.id)),
          selectedBrand:
            state.selectedBrand && brandIds.includes(state.selectedBrand.id)
              ? null
              : state.selectedBrand,
          isLoading: false,
        }));

        // Refresh shared brandStore for user/vendor side
        try {
          // Dynamically import to avoid circular dependency
          const { useBrandStore } = await import('../../../shared/store/brandStore');
          const brandStore = useBrandStore.getState();
          if (brandStore.refreshBrands) {
            await brandStore.refreshBrands();
          }
        } catch (err) {
          console.error('Error refreshing shared brand store:', err);
        }

        return true;
      } else {
        throw new Error(response.message || 'Failed to delete brands');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Toggle brand status
  toggleBrandStatus: async (brandId) => {
    set({ isLoading: true });
    try {
      const response = await api.put(`/admin/brands/${brandId}/toggle-status`);

      if (response.success && response.data) {
        const updatedBrand = transformBrand(response.data.brand);

        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId ? updatedBrand : b
          ),
          selectedBrand:
            state.selectedBrand?.id === brandId
              ? updatedBrand
              : state.selectedBrand,
          isLoading: false,
        }));

        // Refresh shared brandStore for user/vendor side
        try {
          // Dynamically import to avoid circular dependency
          const { useBrandStore } = await import('../../../shared/store/brandStore');
          const brandStore = useBrandStore.getState();
          if (brandStore.refreshBrands) {
            await brandStore.refreshBrands();
          }
        } catch (err) {
          console.error('Error refreshing shared brand store:', err);
        }

        return updatedBrand;
      } else {
        throw new Error(response.message || 'Failed to toggle brand status');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Clear selected brand
  clearSelectedBrand: () => {
    set({ selectedBrand: null });
  },
}));

// Transform backend brand to frontend format
const transformBrand = (brand) => {
  return {
    id: brand._id || brand.id,
    _id: brand._id,
    name: brand.name,
    logo: brand.logo || null,
    description: brand.description || '',
    website: brand.website || '',
    isActive: brand.isActive !== false,
    createdAt: brand.createdAt || new Date().toISOString(),
    updatedAt: brand.updatedAt || new Date().toISOString(),
  };
};

