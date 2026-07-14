import { create } from "zustand";
import toast from "react-hot-toast";
import {
  getAdminDefaultBanners,
  createAdminDefaultBanner,
  updateAdminDefaultBanner,
  deleteAdminDefaultBanner
} from "../../modules/Vendor/services/heroBannerService";

export const useBannerStore = create(
  (set, get) => ({
    banners: [],
    isLoading: false,

    // Initialize/Fetch banners from API
    initialize: async (params = {}) => {
      set({ isLoading: true });
      try {
        const response = await getAdminDefaultBanners(params);
        if (response.success) {
          // Normalize IDs to match frontend expectations (some might use _id)
          const normalizedBanners = response.data.map(b => ({
            ...b,
            id: b._id || b.id
          }));
          set({ banners: normalizedBanners, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false });
        console.error("Failed to fetch banners:", error);
      }
    },

    // Create banner
    createBanner: async (bannerData) => {
      set({ isLoading: true });
      try {
        // Handle both JSON and FormData
        let response;
        if (bannerData instanceof FormData) {
          response = await createAdminDefaultBanner(bannerData);
        } else {
          // Convert object to FormData if needed (service expects FormData for images)
          const formData = new FormData();
          Object.keys(bannerData).forEach(key => {
            if (bannerData[key] !== null && bannerData[key] !== undefined) {
              formData.append(key, bannerData[key]);
            }
          });
          response = await createAdminDefaultBanner(formData);
        }

        if (response.success) {
          const newBanner = {
            ...response.data,
            id: response.data._id || response.data.id
          };
          set(state => ({
            banners: [...state.banners, newBanner],
            isLoading: false
          }));
          toast.success("Banner created successfully");
          return newBanner;
        }
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        toast.error(error.message || "Failed to create banner");
        throw error;
      }
    },

    // Update banner
    updateBanner: async (id, bannerData) => {
      set({ isLoading: true });
      try {
        let response;
        if (bannerData instanceof FormData) {
          response = await updateAdminDefaultBanner(id, bannerData);
        } else {
          const formData = new FormData();
          Object.keys(bannerData).forEach(key => {
            if (bannerData[key] !== null && bannerData[key] !== undefined) {
              formData.append(key, bannerData[key]);
            }
          });
          response = await updateAdminDefaultBanner(id, formData);
        }

        if (response.success) {
          const updatedBanner = {
            ...response.data,
            id: response.data._id || response.data.id
          };
          set(state => ({
            banners: state.banners.map(b => b.id === id ? updatedBanner : b),
            isLoading: false
          }));
          toast.success("Banner updated successfully");
          return updatedBanner;
        }
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        toast.error(error.message || "Failed to update banner");
        throw error;
      }
    },

    // Delete banner
    deleteBanner: async (id) => {
      set({ isLoading: true });
      try {
        const response = await deleteAdminDefaultBanner(id);
        if (response.success) {
          set(state => ({
            banners: state.banners.filter(b => b.id !== id),
            isLoading: false
          }));
          toast.success("Banner deleted successfully");
          return true;
        }
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        toast.error("Failed to delete banner");
        throw error;
      }
    },

    // Reorder/Toggle (can be handled by updating individual banners or implementing better backend support)
    toggleBannerStatus: async (id) => {
      const banner = get().banners.find(b => b.id === id);
      if (banner) {
        await get().updateBanner(id, { isActive: !banner.isActive });
      }
    },

    reorderBanners: async (bannerIds) => {
      // For now, this just updates order but doesn't have a bulk API
      // A proper implementation would have api.post('/reorder-banners', bannerIds)
      toast.info("Reordering manually. In a real app, we'd sync this with backend.");
      // Logic to sync order with backend individually (placeholder)
    }
  })
);
