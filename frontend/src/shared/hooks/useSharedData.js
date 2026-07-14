import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Hook to fetch and cache categories
 * @returns {Object} { categories, isLoading, error }
 */
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories?limit=1000&sortBy=order&sortOrder=asc');
      const result = response?.data || response;
      const list = result?.categories || result?.data?.categories || [];
      
      // Transform categories to consistent format (similar to categoryStore)
      return list.map(category => ({
        ...category,
        id: category._id || category.id,
        parentId: category.parentId ? String(category.parentId) : null,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to fetch and cache admin products
 * @returns {Object} { products, isLoading, error }
 */
export const useAdminProducts = () => {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const response = await api.get("/admin/products", {
        params: {
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      const products = response.data?.products || response.products || [];
      
      // Transform products
      return products.map(product => ({
        ...product,
        id: product._id || product.id,
        categoryId: product.categoryId?._id || product.categoryId?.id || product.categoryId,
        subcategoryId: product.subcategoryId?._id || product.subcategoryId?.id || product.subcategoryId,
        subSubCategoryId: product.subSubCategoryId?._id || product.subSubCategoryId?.id || product.subSubCategoryId,
        vendorId: product.vendorId?._id || product.vendorId?.id || product.vendorId,
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch and cache brands
 * @returns {Object} { brands, isLoading, error }
 */
export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await api.get('/brands?limit=100&sortBy=name&sortOrder=asc');
      return response.data?.brands || response.brands || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Hook to fetch and cache a single product
 * @param {string} productId 
 * @returns {Object} { product, isLoading, error }
 */
export const useProduct = (productId) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await api.get(`/products/${productId}`);
      return response.data?.product || response.product;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch and cache all vendors (admin only)
 * @returns {Object} { vendors, isLoading, error }
 */
export const useVendors = () => {
  return useQuery({
    queryKey: ['admin', 'vendors'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors?limit=1000&status=active');
      const vendors = response.data?.vendors || response.vendors || [];
      
      // Transform vendors to consistent format
      return vendors.map(vendor => ({
        id: vendor._id || vendor.id,
        _id: vendor._id,
        name: vendor.name,
        storeName: vendor.storeName,
        email: vendor.email,
        status: vendor.status,
        isActive: vendor.isActive !== false,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};
