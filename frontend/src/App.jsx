import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { lazyWithRetry } from "./shared/utils/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  initializePushNotifications,
  setupForegroundNotificationHandler,
  registerFCMToken,
} from "./services/pushNotificationService";
import { ENABLE_FCM } from "./firebase";
const ScrollToTop = lazyWithRetry(
  () => import("./shared/components/ScrollToTop"),
);
const AdminLogin = lazyWithRetry(() => import("./modules/Admin/pages/Login"));
const AdminProtectedRoute = lazyWithRetry(
  () => import("./modules/Admin/components/AdminProtectedRoute"),
);
const AdminLayout = lazyWithRetry(
  () => import("./modules/Admin/components/Layout/AdminLayout"),
);
const Dashboard = lazyWithRetry(
  () => import("./modules/Admin/pages/Dashboard"),
);
const AdminUserManagement = lazyWithRetry(
  () => import("./modules/Admin/pages/UserManagement"),
);
const More = lazyWithRetry(() => import("./modules/Admin/pages/More"));
const Notifications = lazyWithRetry(
  () => import("./modules/Admin/pages/notifications/Notifications"),
);
// const PushNotifications = lazyWithRetry(() => import("./modules/Admin/pages/notifications/PushNotifications"));
// const CustomMessages = lazyWithRetry(() => import("./modules/Admin/pages/notifications/CustomMessages"));

// Consolidated Settings pages removed as per user request

// Firebase child pages removed
// const PushConfig = lazyWithRetry(() => import("./modules/Admin/pages/firebase/PushConfig"));
// const Authentication = lazyWithRetry(() => import("./modules/Admin/pages/firebase/Authentication"));

// Admin B2B Vendor Routes
const AdminB2BVendors = lazyWithRetry(
  () => import("./modules/Admin/pages/B2BVendors"),
);
const AdminManageB2BVendors = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/ManageB2BVendors"),
);
const AdminB2BVendorPendingApprovals = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/PendingApprovals"),
);
const AdminB2BVendorProductListings = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/ProductListings"),
);
const AdminB2BProductDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/ProductDetail"),
);
const AdminB2BSubscriptionWallet = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/SubscriptionWallet"),
);
const AdminB2BVendorLotSlots = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/LotSlots"),
);
const AdminB2BVendorLotSlotDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/LotSlotDetail"),
);
const AdminB2BVendorProperties = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/Properties"),
);
const AdminB2BVendorPropertyDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/PropertyDetail"),
);
const AdminB2BVendorAnalyticsPage = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/B2BVendorAnalytics"),
);
const AdminB2BSubscriptions = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/Subscriptions"),
);
const B2BWallet = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/B2BWallet"),
);
const AdminB2BCategories = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/Categories"),
);
const AdminB2BBannerManagement = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/B2BBannerManagement"),
);
const AdminB2BBannerDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/AdminB2BBannerDetail"),
);
const AdminDefaultBannerManagement = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/DefaultBannerManagement"),
);
const AdminBusinessTypeConfiguration = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/BusinessTypeConfiguration"),
);
const AdminB2BAddonPlans = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/AddonPlans"),
);
const AdminVendorDashboardView = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/AdminVendorDashboardView"),
);
const SupportSettings = lazyWithRetry(
  () => import("./modules/Admin/pages/SupportSettings"),
);
const AdminReelModeration = lazyWithRetry(
  () => import("./modules/Admin/pages/ReelModeration"),
);
const AdminMusicLibrary = lazyWithRetry(
  () => import("./modules/Admin/pages/MusicLibrary"),
);
const AdminReelReports = lazyWithRetry(
  () => import("./modules/Admin/pages/ReelReports"),
);
const AdminFeedbacks = lazyWithRetry(
  () => import("./modules/Admin/pages/Feedbacks"),
);
const AdminJobCategories = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/JobCategories"),
);
const AdminJobListings = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/JobListings"),
);
const RouteWrapper = lazyWithRetry(
  () => import("./shared/components/RouteWrapper"),
);
const AdminTransactions = lazyWithRetry(
  () => import("./modules/Admin/pages/Transactions"),
);
const ProtectedRoute = lazyWithRetry(
  () => import("./shared/components/Auth/ProtectedRoute"),
);
const ErrorBoundary = lazyWithRetry(
  () => import("./shared/components/ErrorBoundary/ErrorBoundary"),
);
const TermsAndConditions = lazyWithRetry(
  () => import("./shared/pages/TermsAndConditions"),
);
const PrivacyPolicy = lazyWithRetry(
  () => import("./shared/pages/PrivacyPolicy"),
);
// Mobile App Routes

// B2B Vendor Routes
const B2BVendorLogin = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Login"),
);
const B2BVendorRegister = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Register.jsx"),
);
const B2BVendorVerification = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Verification"),
);
const B2BVendorProtectedRoute = lazyWithRetry(
  () => import("./modules/B2BVendor/components/B2BVendorProtectedRoute"),
);
const B2BVendorLayout = lazyWithRetry(
  () => import("./modules/B2BVendor/components/Layout/B2BVendorLayout"),
);
const B2BVendorDashboard = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Dashboard"),
);
const B2BVendorProducts = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Products"),
);
const B2BVendorManageProducts = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/products/ManageProducts"),
);
const B2BVendorAddProduct = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/products/AddProduct"),
);
const B2BVendorEditProduct = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/products/EditProduct"),
);

const B2BVendorProperties = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Properties"),
);
const B2BVendorManageProperties = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/ManageProperties"),
);
const B2BVendorAddProperty = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddProperty"),
);
const B2BVendorAddFlat = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddFlat"),
);
const B2BVendorAddVilla = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddVilla"),
);
const B2BVendorAddPlot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddPlot"),
);
const B2BVendorEditProperty = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/EditProperty"),
);

const B2BVendorSettings = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Settings"),
);
const B2BVendorProfile = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Profile"),
);
const B2BVendorSubscription = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Subscription"),
);
const B2BVendorBilling = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Billing"),
);
const B2BVendorBannerBooking = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/B2BBannerBooking"),
);
const B2BVendorContactAnalytics = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/ContactAnalytics.jsx"),
);
const B2BVendorPaymentPage = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/PaymentPage"),
);
const B2BVendorForgotPassword = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/ForgotPassword"),
);

const B2BVendorManageLots = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/ManageLotSlot"),
);
const B2BVendorReels = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Reels"),
);
const B2BVendorUploadReel = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/UploadReel"),
);
const B2BVendorAddLot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/AddLotSlot"),
);
const B2BVendorEditLot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/EditLotSlot"),
);
const B2BVendorNotifications = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/VendorNotifications"),
);
const B2BVendorShopListing = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/shop/ShopListing"),
);
const B2BVendorFollowers = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Followers"),
);
const B2BVendorReferral = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Referral"),
);
const B2BVendorHowToUse = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/VendorHowToUse"),
);
const B2BVendorWallet = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/WalletPage"),
);
const B2BVendorSupport = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/VendorSupport"),
);
const VendorJobs = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/VendorJobs"),
);

// B2B User App Routes
const B2BUserLogin = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Login"),
);
const B2BUserRegister = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Register"),
);
const B2BUserVerification = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Verification"),
);
const B2BUserForgotPassword = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/ForgotPassword"),
);

const B2BProductCatalog = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/ProductCatalog"),
);

const B2BUserProfile = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Profile"),
);
const B2BPersonalProfile = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/PersonalProfile"),
);
const B2BCompanyProfile = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/CompanyProfile"),
);
const B2BNotifications = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Notifications"),
);
const B2BHowToUse = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/HowToUse"),
);

const B2BPayments = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Payments"),
);
const B2BSupport = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/Support"),
);
const B2BProductDetail = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/ProductDetail"),
);
const JobsPage = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/JobsPage"),
);
const B2BVendorStore = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/B2BVendorStore"),
);
const SellerTypeSelection = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/SellerTypeSelection"),
);
const B2BLanding = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/B2BLanding"),
);
const ReelFeed = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/ReelFeed"),
);
const RealEstate = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/RealEstate"),
);
const PropertyDetail = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/PropertyDetail"),
);
const RealEstatePropertyUpload = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/PropertyUpload"),
);

// Inner component that has access to useLocation
const RegisterRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/b2b/register${location.search || ""}`} replace />;
};

const ForegroundNotificationHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!ENABLE_FCM) return;

    return setupForegroundNotificationHandler((payload) => {
      if (payload?.data?.link && payload?.data?.type !== "test") {
        let link = payload.data.link;
        // Convert full URL to relative path if it belongs to this site
        try {
          const url = new URL(link);
          if (url.origin === window.location.origin) {
            link = url.pathname + url.search + url.hash;
          }
        } catch (e) {
          // Not a full URL, use as is
        }
        navigate(link);
      }
    });
  }, [navigate]);

  return null;
};

const AppRoutes = () => {
  // Test System Toast
  useEffect(() => {
    // toast.success("System Connected");
  }, []);

  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50/50 backdrop-blur-sm fixed inset-0 z-[9999]">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-xl">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900">
                Loading Experience
              </span>
              <span className="text-sm text-gray-500">
                Preparing your marketplace...
              </span>
            </div>
          </div>
        </div>
      }>
      <Routes>
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/user-privacy-policy" element={<PrivacyPolicy type="user" />} />
        <Route path="/vendor-privacy-policy" element={<PrivacyPolicy type="vendor" />} />
        <Route path="/" element={<Navigate to="/b2b/landing" replace />} />
        <Route
          path="/b2b-vendors"
          element={<Navigate to="/admin/b2b-vendors" replace />}
        />
        <Route
          path="/wholesalers"
          element={<Navigate to="/admin/b2b-vendors" replace />}
        />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<AdminUserManagement />} />

          {/* Admin B2B Vendor Routes */}
          <Route path="b2b-vendors">
            <Route index element={<AdminB2BVendors />} />
            <Route path="manage" element={<AdminManageB2BVendors />} />
            <Route
              path="pending"
              element={<AdminB2BVendorPendingApprovals />}
            />
            <Route
              path="products"
              element={<AdminB2BVendorProductListings />}
            />
            <Route path="products/:id" element={<AdminB2BProductDetail />} />
            <Route path="lot-slots" element={<AdminB2BVendorLotSlots />} />
            <Route
              path="lot-slots/:id"
              element={<AdminB2BVendorLotSlotDetail />}
            />
            <Route path="properties" element={<AdminB2BVendorProperties />} />
            <Route
              path="properties/:id"
              element={<AdminB2BVendorPropertyDetail />}
            />
            <Route path="analytics" element={<AdminB2BVendorAnalyticsPage />} />
            <Route path="wallet" element={<B2BWallet />} />
            <Route
              path="subscription-wallet"
              element={<AdminB2BSubscriptionWallet />}
            />
            <Route path="subscriptions" element={<AdminB2BSubscriptions />} />
            <Route path="addon-plans" element={<AdminB2BAddonPlans />} />
            <Route path="categories" element={<AdminB2BCategories />} />
            <Route path="job-categories" element={<AdminJobCategories />} />
            <Route path="job-listings" element={<AdminJobListings />} />
            <Route
              path="banner-bookings"
              element={<AdminB2BBannerManagement />}
            />
            <Route
              path="banner-bookings/details/:id"
              element={<AdminB2BBannerDetail />}
            />
            <Route
              path="default-banners"
              element={<AdminDefaultBannerManagement />}
            />
            <Route
              path="business-type-config"
              element={<AdminBusinessTypeConfiguration />}
            />
            <Route
              path="manage/:id/dashboard"
              element={<AdminVendorDashboardView />}
            />
            <Route
              path="manage/:id/contact-analytics"
              element={<B2BVendorContactAnalytics mode="admin" />}
            />
          </Route>

          <Route path="notifications" element={<Notifications />} />
          <Route path="reels" element={<AdminReelModeration />} />
          <Route path="reel-reports" element={<AdminReelReports />} />
          <Route path="music-library" element={<AdminMusicLibrary />} />
          <Route path="support-settings" element={<SupportSettings />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="feedbacks" element={<AdminFeedbacks />} />
        </Route>

        {/* B2B User App Routes */}
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/b2b/login" element={<B2BUserLogin />} />
        <Route path="/b2b/register" element={<B2BUserRegister />} />
        <Route path="/b2b/verification" element={<B2BUserVerification />} />
        <Route
          path="/b2b/forgot-password"
          element={<B2BUserForgotPassword />}
        />

        <Route path="/b2b" element={<Navigate to="/b2b/landing" replace />} />
        <Route path="/b2b/landing" element={<B2BLanding />} />
        <Route
          path="/b2b/reels"
          element={<ReelFeed />}
        />
        <Route
          path="/b2b/reels/:reelId"
          element={<ReelFeed />}
        />
        <Route
          path="/b2b/catalog"
          element={<B2BProductCatalog />}
        />
        <Route
          path="/b2b/jobs"
          element={<JobsPage />}
        />
        <Route path="/b2b/real-estate">
          <Route
            index
            element={<RealEstate />}
          />
          <Route
            path="developers"
            element={<Navigate to="/b2b/real-estate" replace />}
          />
          <Route
            path="brokers"
            element={<Navigate to="/b2b/real-estate" replace />}
          />
          <Route
            path="property/:id"
            element={
              <ProtectedRoute>
                <PropertyDetail />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/b2b/vendor/property-upload"
          element={<RealEstatePropertyUpload />}
        />

        <Route
          path="/b2b/profile"
          element={
            <ProtectedRoute>
              <B2BUserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/b2b/personal-profile"
          element={
            <ProtectedRoute>
              <B2BPersonalProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/b2b/seller-selection"
          element={
            <ProtectedRoute>
              <SellerTypeSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/b2b/company"
          element={
            <ProtectedRoute>
              <B2BCompanyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/b2b/notifications"
          element={
            <ProtectedRoute>
              <B2BNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/b2b/payments"
          element={
            <ProtectedRoute>
              <B2BPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/b2b/support"
          element={<B2BSupport />}
        />
        <Route
          path="/b2b/how-to-use"
          element={<B2BHowToUse />}
        />
        <Route
          path="/b2b/product/:id"
          element={<B2BProductDetail />}
        />
        <Route
          path="/b2b/vendor/:id"
          element={<B2BVendorStore />}
        />

        {/* B2B Vendor Routes */}
        <Route path="/b2b-vendor/login" element={<B2BVendorLogin />} />
        <Route path="/b2b-vendor/register" element={<B2BVendorRegister />} />
        <Route path="/b2b-vendor/payment" element={<B2BVendorPaymentPage />} />
        <Route
          path="/b2b-vendor/verification"
          element={<B2BVendorVerification />}
        />
        <Route
          path="/b2b-vendor/forgot-password"
          element={<B2BVendorForgotPassword />}
        />
        <Route
          path="/b2b-vendor"
          element={
            <B2BVendorProtectedRoute>
              <B2BVendorLayout />
            </B2BVendorProtectedRoute>
          }>
          <Route
            index
            element={<Navigate to="/b2b-vendor/dashboard" replace />}
          />
          <Route path="dashboard" element={<B2BVendorDashboard />} />

          <Route path="products">
            <Route index element={<B2BVendorProducts />} />
            <Route
              path="manage-products"
              element={<B2BVendorManageProducts />}
            />
            <Route path="add-product" element={<B2BVendorAddProduct />} />
            <Route path="edit/:id" element={<B2BVendorEditProduct />} />
          </Route>

          <Route path="shop-listing" element={<B2BVendorShopListing />} />
          <Route path="jobs" element={<VendorJobs />} />

          <Route path="properties">
            <Route index element={<B2BVendorProperties />} />
            <Route path="manage-properties" element={<B2BVendorManageProperties />} />
            <Route path="add-property" element={<B2BVendorAddProperty />} />
            <Route path="add-commercial" element={<B2BVendorAddProperty />} />
            <Route path="add-flat" element={<B2BVendorAddFlat />} />
            <Route path="add-villa" element={<B2BVendorAddVilla />} />
            <Route path="add-plot" element={<B2BVendorAddPlot />} />
            <Route path="edit/:id" element={<B2BVendorEditProperty />} />
          </Route>

          <Route path="settings" element={<B2BVendorSettings />} />
          <Route path="settings/profile" element={<B2BVendorSettings />} />
          <Route
            path="settings/business"
            element={<Navigate to="/b2b-vendor/settings/profile" replace />}
          />

          <Route path="subscription" element={<B2BVendorSubscription />} />
          <Route path="billing" element={<B2BVendorBilling />} />
          <Route path="wallet" element={<B2BVendorWallet />} />
          <Route path="banner-booking" element={<B2BVendorBannerBooking />} />
          <Route path="lotslot">
            <Route
              index
              element={
                <Navigate to="/b2b-vendor/lotslot/manage-lots" replace />
              }
            />
            <Route path="manage-lots" element={<B2BVendorManageLots />} />
            <Route path="add-lotslot" element={<B2BVendorAddLot />} />
            <Route path="edit/:id" element={<B2BVendorEditLot />} />
          </Route>
          <Route
            path="analytics/clicks"
            element={<B2BVendorContactAnalytics mode="vendor" />}
          />
          <Route path="profile" element={<B2BVendorProfile />} />
          <Route path="notifications" element={<B2BVendorNotifications />} />
          <Route path="reels" element={<B2BVendorReels />} />
          <Route path="reels/upload" element={<B2BVendorUploadReel />} />
          <Route path="followers" element={<B2BVendorFollowers />} />
          <Route path="referral" element={<B2BVendorReferral />} />
          <Route path="how-to-use" element={<B2BVendorHowToUse />} />
          <Route path="support" element={<B2BVendorSupport />} />
        </Route>
        <Route path="*" element={<Navigate to="/b2b/landing" replace />} />
      </Routes>
    </Suspense>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  useEffect(() => {
    if (!ENABLE_FCM) {
      return;
    }

    initializePushNotifications();
    
    try {
      const hasAuth =
        localStorage.getItem("token") ||
        localStorage.getItem("b2b-vendor-token") ||
        localStorage.getItem("admin-token");
      const hasFCM = localStorage.getItem("fcm_token_web");
      if (hasAuth && !hasFCM && ENABLE_FCM) {
        registerFCMToken(true)
          .then((t) => {})
          .catch((e) => {});
      }
    } catch { }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}>
          <ScrollToTop />
          <ForegroundNotificationHandler />
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            }>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              zIndex: 99999,
              top: 'max(48px, env(safe-area-inset-top, 24px))',
            }}
            toastOptions={{
              duration: 3000,
              style: {
                background: "#212121",
                color: "#fff",
                zIndex: 99999,
                fontSize: "14px",
                maxWidth: "90%",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#388E3C",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#FF6161",
                  secondary: "#fff",
                },
              },
            }}
          />
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
