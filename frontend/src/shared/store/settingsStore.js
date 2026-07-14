import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import toast from "react-hot-toast";
import logoImage from "../../../data/logos/dealing-india-logo.png";
import api from "../utils/api";

const defaultSettings = {
  general: {
    storeName: "Dealing India",
    storeLogo: logoImage,
    favicon: logoImage,
    contactEmail: "contact@example.com",
    contactPhone: "+1234567890",
    address: "",
    businessHours: "Mon-Fri 9AM-6PM",
    timezone: "UTC",
    currency: "INR",
    language: "en",
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
    },
    accentColor: "#FFE11B",
    storeDescription: "",
  },
  payment: {
    paymentMethods: ["cod", "card", "wallet"],
    codEnabled: true,
    cardEnabled: true,
    walletEnabled: true,
    upiEnabled: false,
    paymentGateway: "stripe",
    stripePublicKey: "",
    stripeSecretKey: "",
    paymentFees: {
      cod: 0,
      card: 2.5,
      wallet: 1.5,
      upi: 0.5,
    },
  },
  shipping: {
    shippingZones: [],
    freeShippingThreshold: 100,
    defaultShippingRate: 5,
    shippingMethods: ["standard", "express"],
  },
  orders: {
    cancellationTimeLimit: 24, // hours
    minimumOrderValue: 0,
    orderTrackingEnabled: true,
    orderConfirmationEmail: true,
    orderStatuses: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
  },
  customers: {
    guestCheckoutEnabled: true,
    registrationRequired: false,
    emailVerificationRequired: false,
    customerAccountFeatures: {
      orderHistory: true,
      wishlist: true,
      addresses: true,
    },
  },
  products: {
    itemsPerPage: 12,
    gridColumns: 4,
    defaultSort: "popularity",
    lowStockThreshold: 10,
    outOfStockBehavior: "show", // 'hide' or 'show'
    stockAlertsEnabled: true,
  },
  content: {
    privacyPolicy: "",
    termsConditions: "",
    refundPolicy: "",
  },
  features: {
    wishlistEnabled: true,
    reviewsEnabled: true,
    flashSaleEnabled: true,
    dailyDealsEnabled: true,
    liveChatEnabled: true,
    couponCodesEnabled: true,
  },
  homepage: {
    heroBannerEnabled: true,
    sections: {
      featuredCategories: { enabled: true },
      newArrivals: { enabled: true },
      bestSellers: { enabled: true },
      dealsOfTheDay: { enabled: false },
      flashSale: { enabled: false },
      topBrands: { enabled: true },
    },
  },
  reviews: {
    moderationMode: "manual", // 'auto' or 'manual'
    purchaseRequired: true,
    displaySettings: {
      showAll: true,
      verifiedOnly: false,
      withPhotosOnly: false,
    },
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "noreply@example.com",
    fromName: "Dealing India",
  },
  notifications: {
    email: {
      orderConfirmation: true,
      shippingUpdate: true,
      deliveryUpdate: true,
    },
    smsEnabled: false,
    pushEnabled: false,
    admin: {
      newOrders: true,
      lowStock: true,
    },
  },
  seo: {
    metaTitle: "Dealing India - Join & Earn Reward Points",
    metaDescription: "Join India's premiere B2B marketplace",
    metaKeywords: "ecommerce, shopping, online store, b2b",
    ogImage: logoImage,
    canonicalUrl: "",
  },
  theme: {
    primaryColor: "#10B981",
    secondaryColor: "#3B82F6",
    fontFamily: "Inter",
  },
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,

      // Initialize settings - fetch from API
      initialize: async () => {
        try {
          set({ isLoading: true });
          const response = await api.get("/settings/public");

          if (response.success && response.data?.settings) {
            const apiSettings = response.data.settings;
            // Merge API settings with defaults to ensure all fields exist
            const mergedSettings = {
              ...defaultSettings,
              ...apiSettings,
              general: { ...defaultSettings.general, ...(apiSettings.general || {}) },
              products: { ...defaultSettings.products, ...(apiSettings.products || {}) },
              features: { ...defaultSettings.features, ...(apiSettings.features || {}) },
              homepage: { ...defaultSettings.homepage, ...(apiSettings.homepage || {}) },
              reviews: { ...defaultSettings.reviews, ...(apiSettings.reviews || {}) },
              notifications: { ...defaultSettings.notifications, ...(apiSettings.notifications || {}) },
              seo: { ...defaultSettings.seo, ...(apiSettings.seo || {}) },
              tax: apiSettings.tax || defaultSettings.tax || {},
            };
            set({ settings: mergedSettings, isLoading: false });
            // Also save to localStorage as backup
            localStorage.setItem("admin-settings", JSON.stringify(mergedSettings));
          } else {
            // If API fails, use localStorage or defaults
            const savedSettings = localStorage.getItem("admin-settings");
            if (savedSettings) {
              set({ settings: JSON.parse(savedSettings), isLoading: false });
            } else {
              set({ settings: defaultSettings, isLoading: false });
              localStorage.setItem("admin-settings", JSON.stringify(defaultSettings));
            }
          }
        } catch (error) {
          console.error("Failed to fetch settings from API:", error);
          // Fallback to localStorage or defaults
          const savedSettings = localStorage.getItem("admin-settings");
          if (savedSettings) {
            set({ settings: JSON.parse(savedSettings), isLoading: false });
          } else {
            set({ settings: defaultSettings, isLoading: false });
            localStorage.setItem("admin-settings", JSON.stringify(defaultSettings));
          }
        }
      },

      // Get settings
      getSettings: () => {
        const state = get();
        if (!state.settings) {
          state.initialize();
        }
        return get().settings;
      },

      // Update settings - save to API
      updateSettings: async (category, settingsData) => {
        set({ isLoading: true });
        try {
          // Update via API
          const response = await api.put(`/admin/settings/${category}`, settingsData);

          if (response.success && response.data?.settings) {
            const apiSettings = response.data.settings;
            const currentSettings = get().settings;
            const updatedSettings = {
              ...currentSettings,
              ...apiSettings, // This will overwrite any categories returned by API
            };
            set({ settings: updatedSettings, isLoading: false });
            // Also save to localStorage as backup
            localStorage.setItem("admin-settings", JSON.stringify(updatedSettings));
            toast.success("Settings updated successfully");
            return updatedSettings;
          } else {
            throw new Error("Failed to update settings");
          }
        } catch (error) {
          console.error("Failed to update settings:", error);
          // Fallback to localStorage only
          try {
            const currentSettings = get().settings;
            const updatedSettings = {
              ...currentSettings,
              [category]: {
                ...currentSettings[category],
                ...settingsData,
              },
            };
            set({ settings: updatedSettings, isLoading: false });
            localStorage.setItem("admin-settings", JSON.stringify(updatedSettings));
            toast.error("Settings saved locally (API update failed)");
            return updatedSettings;
          } catch (localError) {
            set({ isLoading: false });
            toast.error("Failed to update settings");
            throw localError;
          }
        }
      },
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
