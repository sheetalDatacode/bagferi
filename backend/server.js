// server.js - Updated at 2026-03-05 11:08
import express from "express";
import http from "http";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import dns from "dns";
import path from "path";
import fs from "fs";

const envPath = path.resolve(process.cwd(), ".env");

dotenv.config();

// Fix for querySrv ECONNREFUSED issues (SRV DNS resolution)
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import connectDB from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { setupSocketIO } from "./config/socket.io.js";
import { connectRedis } from "./config/redis.config.js";
import redisClient from "./config/redis.config.js";

// Import routes
import vendorDashboardRoutes from "./routes/vendorDashboard.routes.js";
import publicVendorRoutes from "./routes/publicVendor.routes.js";
import adminB2BSubscriptionPlanRoutes from "./routes/adminB2BSubscriptionPlan.routes.js";
import adminB2BVendorSubscriptionRoutes from "./routes/adminB2BVendorSubscription.routes.js";
import adminB2BVendorManagementRoutes from "./routes/adminB2BVendorManagement.routes.js";
import adminB2BCategoryManagementRoutes from "./routes/adminB2BCategoryManagement.routes.js";
import vendorSubscriptionRoutes from "./routes/vendorSubscription.routes.js";
import publicB2BCategoryRoutes from "./routes/publicB2BCategory.routes.js";
import publicB2BLocationRoutes from "./routes/publicB2BLocation.routes.js";
import publicB2BSubscriptionRoutes from "./routes/publicB2BSubscription.routes.js";
import SubscriptionRoutes from "./routes/SubscriptionRoute.js";
import upgradeRoutes from "./routes/upgrade.routes.js";
import adminB2BAddonPlanRoutes from "./routes/adminB2BAddonPlan.routes.js";
import vendorAddonRoutes from "./routes/vendorAddon.routes.js";
import adminB2BSettingsRoutes from "./routes/adminB2BSettings.routes.js";
import feedbackRoutes from "./routes/Feedback.routes.js";

import b2bVendorProductsRoutes from "./routes/b2bVendorProducts.routes.js";
import b2bVendorShopUnitRoutes from "./routes/b2bVendorShopUnit.routes.js";
import lotSlotRoutes from "./routes/lotSlot.routes.js";

import adminB2BProductManagementRoutes from "./routes/adminB2BProductManagement.routes.js";
import adminLotSlotRoutes from "./routes/adminLotSlot.routes.js";
import adminPropertyRoutes from "./routes/adminProperty.routes.js";
import publicProductRoutes from "./routes/publicProduct.routes.js";
import ratingRoutes from "./routes/rating.routes.js";

import vendorAuthRoutes from "./routes/vendorAuth.routes.js";
import adminAuthRoutes from "./routes/adminAuth.routes.js";
import userAuthRoutes from "./routes/userAuth.routes.js";
import authRoutes from "./routes/auth.routes.js";

import adminMediaRoutes from "./routes/media.routes.js";
import heroBannerVendorRoutes from "./routes/heroBannerVendor.routes.js";
import heroBannerAdminRoutes from "./routes/heroBannerAdmin.routes.js";
import heroBannerPublicRoutes from "./routes/heroBannerPublic.routes.js";
import adminDefaultBannerRoutes from "./routes/adminDefaultBanner.routes.js";
import publicBannerRoutes from "./routes/publicBanner.routes.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import businessTypeRoutes from "./routes/businessType.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import adminBusinessSettingsRoutes from "./routes/adminBusinessSettings.routes.js";
import adminNotificationRoutes from "./routes/adminNotification.routes.js";
import adminUserRoutes from "./routes/adminUser.routes.js";
import vendorAnalyticsRoutes from "./routes/vendorAnalytics.routes.js";
import vendorNotificationRoutes from "./routes/vendorNotification.routes.js";
import userNotificationRoutes from "./routes/userNotification.routes.js";
import fcmTokenRoutes from "./routes/fcmToken.routes.js";
import supportConfigRoutes from "./routes/supportConfig.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import adminReferralSettingsRoutes from "./routes/adminReferralSettings.routes.js";
import reelRoutes from "./routes/reel.routes.js";
import adminReelRoutes from "./routes/adminReel.routes.js";
import { B2BSubscriptionExpiryCron } from "./Cron/SubscriptionCron.js";
import { syncVendorViewsCron } from "./Cron/VendorViewSync.cron.js";
import bannerBookingCron from "./Cron/BannerBooking.cron.js";
import { startReelExpiryCron, startYouTubeLinkValidationCron } from "./Cron/ReelExpiry.cron.js";
import musicRoutes from "./routes/music.routes.js";
import vendorFollowRoutes from "./routes/vendorFollow.routes.js";
import adminTransactionsRoutes from "./routes/adminTransactions.routes.js";
import vendorWalletRoutes from "./routes/vendorWallet.routes.js";
import adminJobCategoryRoutes from "./routes/adminJobCategory.routes.js";
import adminJobsRoutes from "./routes/adminJobs.routes.js";
import vendorJobRoutes from "./routes/vendorJob.routes.js";
import publicJobRoutes from "./routes/publicJob.routes.js";

// Initialize Express app
const app = express();
app.use(compression());

// Trust proxy for Render/Vercel to get correct IP and protocol
app.set("trust proxy", true);

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "https://dealing-india.vercel.app",
  "https://dealing-india-*.vercel.app",
  "https://www.dealingindia.com",
  "https://dealingindia.com",
  "https://www.dealingindia.in",
  "https://dealingindia.in",
  "https://dealing-india.onrender.com",
];

const envOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];

const corsOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

const normalizeOrigin = (o) => (o ? o.toLowerCase().replace(/\/+$/, "") : "");

const allowedBaseDomains = [
  "dealingindia.com",
  "dealingindia.in",
  "vercel.app",
  "onrender.com",
];

const normalizedCorsOrigins = new Set(corsOrigins.map(normalizeOrigin));

// Global Request Logger for Debugging
app.use((req, res, next) => {
  const origin = req.headers.origin || 'No Origin';
  const auth = req.headers.authorization ? 'Present' : 'Missing';
  // Only log in production or if debug flag is present
  if (process.env.NODE_ENV === 'production' || req.query.debug === 'true') {
    console.log(`[Request Log] ${req.method} ${req.path} | Origin: ${origin} | Auth: ${auth}`);
  }
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (normalizedCorsOrigins.has(normalized)) {
        return callback(null, true);
      }
      const isAllowedDomain = allowedBaseDomains.some(
        (domain) =>
          normalized.endsWith(`.${domain}`) ||
          normalized === `https://${domain}` ||
          normalized === `http://${domain}`,
      );
      if (isAllowedDomain) {
        return callback(null, true);
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
        return callback(null, true);
      }
      console.warn(`⚠️ CORS rejected origin: ${origin}`);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use("/upload", express.static(join(__dirname, "upload")));

// Integration Audit Dashboard
app.get("/admin/integration-audit", (req, res) => {
  res.sendFile(join(process.cwd(), "public", "integration-audit.html"));
});

app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    database: states[dbStatus] || "Unknown",
    databaseReady: dbStatus === 1,
    redis: redisClient.isReady ? "Connected" : "Disconnected",
    redisReady: redisClient.isReady,
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

app.post("/api/test-register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const dbStatus = mongoose.connection.readyState;
    const dbConnected = dbStatus === 1;
    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    res.json({
      success: true,
      message: "Registration test endpoint",
      checks: {
        databaseConnected: dbConnected,
        databaseState: dbStatus,
        emailConfigured,
        hasMongoDBURI: !!process.env.MONGODB_URI,
        hasJWTSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        corsOriginsCount: corsOrigins.length,
      },
      receivedData: {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
        hasPhone: !!phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/test-db", (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const states = { 0: "Disconnected", 1: "Connected", 2: "Connecting", 3: "Disconnecting" };
    res.json({
      success: dbStatus === 1,
      message: "Database connection test",
      status: states[dbStatus] || "Unknown",
      readyState: dbStatus,
      databaseName: mongoose.connection.name,
      host: mongoose.connection.host,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Database test failed", error: error.message });
  }
});

import { razorpayWebhook } from "./controllers/SubscriptionCtrl.js";

// Routes
app.use("/api/auth/vendor", vendorAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userAuthRoutes);

app.use("/api/vendors", publicVendorRoutes);
app.use("/api/public/b2b-categories", publicB2BCategoryRoutes);
app.use("/api/public", publicB2BLocationRoutes);
app.use("/api/public/b2b-subscription-plans", publicB2BSubscriptionRoutes);

app.use("/api/subscription", SubscriptionRoutes);
app.use("/api/subscriptions", SubscriptionRoutes);
app.use("/api/subscriptions/upgrade", upgradeRoutes);
app.use("/api/products", publicProductRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use("/api/admin/media", adminMediaRoutes);
app.use("/api/admin/b2b-subscription-plans", adminB2BSubscriptionPlanRoutes);
app.use("/api/admin/b2b-vendors/subscriptions", adminB2BVendorSubscriptionRoutes);
app.use("/api/admin/b2b-vendors", adminB2BVendorManagementRoutes);
app.use("/api/admin/b2b-categories", adminB2BCategoryManagementRoutes);
app.use("/api/admin/b2b-products", adminB2BProductManagementRoutes);
app.use("/api/admin/lot-slots", adminLotSlotRoutes);
app.use("/api/admin/properties", adminPropertyRoutes);
app.use("/api/vendor/dashboard", vendorDashboardRoutes);
app.use("/api/vendor/subscriptions", vendorSubscriptionRoutes);
app.use("/api/vendor/subscription", vendorSubscriptionRoutes);
app.use("/api/vendor/addons", vendorAddonRoutes);
app.use("/api/admin/b2b-addon-plans", adminB2BAddonPlanRoutes);
app.use("/api/admin/b2b-settings", adminB2BSettingsRoutes);
app.use("/api/vendor/analytics", vendorAnalyticsRoutes);
app.use("/api/vendor/notifications", vendorNotificationRoutes);
app.use("/api/user/notifications", userNotificationRoutes);
app.use("/api/fcm-tokens", fcmTokenRoutes);

app.use("/api/b2b-vendor/products", b2bVendorProductsRoutes);
app.use("/api/b2b-vendor/shop-units", b2bVendorShopUnitRoutes);
app.use("/api/b2b-vendor/lot-slots", lotSlotRoutes);
app.use("/api/support-config", supportConfigRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin/referral-settings", adminReferralSettingsRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/admin/reels", adminReelRoutes);
app.use("/api/follow", vendorFollowRoutes);
app.use("/api/vendor/wallet", vendorWalletRoutes);

app.use("/api/music", musicRoutes);
app.use("/api/business-types", businessTypeRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/admin/business-settings", adminBusinessSettingsRoutes);
app.use("/api/vendor/business-settings", adminBusinessSettingsRoutes);

app.use("/api/public/hero-banners", heroBannerPublicRoutes);
app.use("/api/vendor/hero-banners", heroBannerVendorRoutes);
app.use("/api/admin/hero-banners", heroBannerAdminRoutes);
app.use("/api/admin/default-banners", adminDefaultBannerRoutes);
app.use("/api/public/banners", publicBannerRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/reports", adminDashboardRoutes);
app.use("/api/admin/transactions", adminTransactionsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/job-categories", adminJobCategoryRoutes);
app.use("/api/admin/jobs", adminJobsRoutes);
app.use("/api/vendor/jobs", vendorJobRoutes);
app.use("/api/jobs", publicJobRoutes);

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  if (process.env.NODE_ENV !== "production") process.exit(1);
});

app.post("/api/v1/razorpay-webhook", express.raw({ type: "application/json" }), razorpayWebhook);
app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Auto self-healing database indexes on startup
    try {
      const db = mongoose.connection.db;
      
      // Repair Users Email Index
      const usersCollection = db.collection('users');
      const userIndexes = await usersCollection.indexes();
      if (userIndexes.some(idx => idx.name === 'email_1')) {
        await usersCollection.dropIndex('email_1');
        console.log('⚡ Refreshed legacy User email index');
      }
      // Clean literal nulls and empty strings so sparse constraint succeeds
      await usersCollection.updateMany(
        { $or: [{ email: null }, { email: "" }] },
        { $unset: { email: "" } }
      );

      // Repair Vendors GST Index
      const vendorsCollection = db.collection('vendors');
      const vendorIndexes = await vendorsCollection.indexes();
      if (vendorIndexes.some(idx => idx.name === 'gstNumber_1')) {
        await vendorsCollection.dropIndex('gstNumber_1');
        console.log('⚡ Refreshed legacy Vendor gstNumber index');
      }
      await vendorsCollection.updateMany(
        { $or: [{ gstNumber: null }, { gstNumber: "" }] },
        { $unset: { gstNumber: "" } }
      );

      // Trigger mongoose to rebuild sparse indexes
      await Promise.all([
        mongoose.model('User').createIndexes(),
        mongoose.model('Vendor').createIndexes()
      ]);
      console.log('✅ Database sparse indexes successfully self-healed');
    } catch (indexErr) {
      console.warn('⚠️ Note on startup db healing:', indexErr.message);
    }

    await connectRedis();
    const io = setupSocketIO(httpServer, corsOrigins);
    app.set("io", io);

    B2BSubscriptionExpiryCron.start();
    syncVendorViewsCron.start();
    bannerBookingCron();
    startReelExpiryCron();
    startYouTubeLinkValidationCron(io);
    console.log("✅ Background Cron Jobs initialized");

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
