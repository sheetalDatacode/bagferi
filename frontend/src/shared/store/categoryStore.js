import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// Helper to transform MongoDB _id to id for frontend compatibility
const transformCategory = (category) => {
  if (!category) return null;
  
  // Convert _id to id
  const id = category._id?.toString() || category.id?.toString() || category.id;
  
  // Convert parentId to string for consistent comparison
  const parentId = category.parentId 
    ? (category.parentId.toString ? category.parentId.toString() : String(category.parentId))
    : null;
  
  return {
    ...category,
    id,
    parentId,
  };
};

const transformCategories = (categories) => {
  return categories.map(transformCategory);
};

export const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,

      // Initialize categories - fetch from API
      initialize: async (forceRefresh = false) => {
        const currentState = get();
        // Only show loader if we have NO categories and it's a force refresh
        // OR if we explicitly want to show it.
        // For background refreshes (forceRefresh=false), never show loader.
        if (forceRefresh && currentState.categories.length === 0) {
          set({ isLoading: true });
        }
        try {
          const params = {
            limit: 1000, // Get all categories
            sortBy: 'order',
            sortOrder: 'asc',
          };
          
          // Add cache-busting parameter if force refresh
          if (forceRefresh) {
            params._t = Date.now();
          }
          
          const response = await api.get('/categories', { params });
          // api returns body, which can be { success, message, data: { categories, ... } }
          const result = response?.data || response;
          const list = result?.categories || result?.data?.categories || [];
          const categories = transformCategories(list);
          
          // Deduplicate categories by ID to prevent duplicates
          const categoryMap = new Map();
          categories.forEach((cat) => {
            const catId = cat.id?.toString();
            if (catId && !categoryMap.has(catId)) {
              categoryMap.set(catId, cat);
            }
          });
          const deduplicatedCategories = Array.from(categoryMap.values());
          
          set({ categories: deduplicatedCategories, isLoading: false });
        } catch (error) {
          // Don't log network errors - they're already handled by API interceptor
          if (!error?.isNetworkError && !error?.isConnectionRefused) {
            console.error('Failed to fetch categories:', error);
          }
          // Only clear categories if this was a non-background refresh
          if (!forceRefresh || currentState.categories.length === 0) {
            set({ categories: [], isLoading: false });
          } else {
            // Keep existing categories on background refresh failure
            set({ isLoading: false });
          }
        }
      },

      // Get all categories
      getCategories: () => {
        const state = get();
        if (state.categories.length === 0) {
          state.initialize();
        }
        return get().categories;
      },

      // Get category by ID
      getCategoryById: (id) => {
        const categories = get().categories;
        return categories.find((cat) => {
          const catId = cat.id || cat._id;
          const searchId = id?.toString() || id;
          return catId?.toString() === searchId;
        });
      },

      // Create category
      createCategory: async (categoryData) => {
        set({ isLoading: true });
        try {
          // Convert id to _id if needed for parentId
          const payload = { ...categoryData };
          if ('parentId' in categoryData) {
            payload.parentId = categoryData.parentId || null;
          }

          const response = await api.post('/admin/categories', payload);
          const newCategory = transformCategory(response.data.category);

          // Optimistically update categories without blocking UI
          set((state) => ({
            categories: [...state.categories, newCategory],
            isLoading: false,
          }));

          // Background refresh to ensure consistency (non-blocking)
          get().initialize(true);

          toast.success('Category created successfully');
          return newCategory;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to create category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Update category
      updateCategory: async (id, categoryData) => {
        set({ isLoading: true });
        try {
          const categoryId = id?.toString() || id;
          const payload = {
            ...categoryData,
          };

          // Only include parentId if it's explicitly provided in categoryData
          // This prevents accidentally resetting parentId to null during simple status toggles (like active/inactive)
          if ('parentId' in categoryData) {
            payload.parentId = categoryData.parentId || null;
          }

          const response = await api.put(`/admin/categories/${categoryId}`, payload);
          const updatedCategory = transformCategory(response.data.category);

          // Update category in place to maintain position and prevent duplicates
          set((state) => {
            const categoryIdStr = updatedCategory.id?.toString();
            
            // Find existing category index to preserve position
            const existingIndex = state.categories.findIndex((cat) => {
              const catId = cat.id?.toString() || cat._id?.toString();
              return catId === categoryIdStr;
            });

            if (existingIndex >= 0) {
              // Update existing category in its current position (no reordering)
              const updatedCategories = [...state.categories];
              updatedCategories[existingIndex] = { ...updatedCategories[existingIndex], ...updatedCategory };
              return { categories: updatedCategories, isLoading: false };
            } else {
              // Fallback: update by map if index not found
              return {
                categories: state.categories.map((cat) => {
                  const catId = cat.id?.toString() || cat._id?.toString();
                  return catId === categoryIdStr ? { ...cat, ...updatedCategory } : cat;
                }),
                isLoading: false,
              };
            }
          });

          // Silent background refresh for consistency (errors are ignored to avoid disrupting UX)
          get().initialize(true).catch(() => {
            // Background refresh failed, but optimistic update is already applied
            // This ensures the UI stays responsive even if refresh fails
          });

          toast.success('Category updated successfully');
          return updatedCategory;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to update category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Delete category
      deleteCategory: async (id) => {
        set({ isLoading: true });
        try {
          const categoryId = id?.toString() || id;
          await api.delete(`/admin/categories/${categoryId}`);

          // Refresh categories list with force refresh
          await get().initialize(true);

          set({ isLoading: false });
          toast.success('Category deleted successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to delete category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Bulk delete categories
      bulkDeleteCategories: async (ids) => {
        set({ isLoading: true });
        try {
          // Convert ids to strings if needed
          const categoryIds = ids.map(id => id?.toString() || id);
          await api.delete('/admin/categories/bulk', {
            data: { ids: categoryIds },
          });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success(`${ids.length} categories deleted successfully`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to delete categories';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Toggle category status
      toggleCategoryStatus: (id) => {
        const category = get().getCategoryById(id);
        if (category) {
          get().updateCategory(id, { isActive: !category.isActive });
        }
      },

      // Get categories by parent
      getCategoriesByParent: (parentId) => {
        const categories = get().categories;
        if (!parentId) return categories.filter((cat) => !cat.parentId);

        // Normalize parentId to string for comparison
        const parentIdStr = parentId?.toString() || String(parentId);
        
        return categories.filter((cat) => {
          // Normalize category's parentId to string
          const catParentId = cat.parentId 
            ? (cat.parentId.toString ? cat.parentId.toString() : String(cat.parentId))
            : null;
          
          // Compare as strings
          return catParentId === parentIdStr;
        });
      },

      // Get root categories
      getRootCategories: () => {
        return get().categories.filter((cat) => !cat.parentId);
      },

      // Reorder categories (using bulk order update)
      reorderCategories: async (categoryIds) => {
        set({ isLoading: true });
        try {
          // Prepare orders array
          const orders = categoryIds.map((id, index) => ({
            id: id?.toString() || id,
            order: index + 1,
          }));

          await api.put('/admin/categories/bulk-order', { orders });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success('Categories reordered successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to reorder categories';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Bulk update category order (for CategoryOrder page)
      bulkUpdateCategoryOrder: async (orderUpdates) => {
        set({ isLoading: true });
        try {
          // Prepare orders array - orderUpdates should be [{ id, order }, ...]
          const orders = orderUpdates.map((item) => ({
            id: item.id?.toString() || item.id,
            order: parseInt(item.order),
          }));

          await api.put('/admin/categories/bulk-order', { orders });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success('Category order saved successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to save category order';
          toast.error(errorMessage);
          throw error;
        }
      },
    }),
    {
      name: 'category-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
