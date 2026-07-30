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


import adminB2BVendorManagementRoutes from "./routes/adminB2BVendorManagement.routes.js";
import adminB2BCategoryManagementRoutes from "./routes/adminB2BCategoryManagement.routes.js";

import publicB2BCategoryRoutes from "./routes/publicB2BCategory.routes.js";
import publicB2BLocationRoutes from "./routes/publicB2BLocation.routes.js";


import adminB2BSettingsRoutes from "./routes/adminB2BSettings.routes.js";
import publicB2BSettingsRoutes from "./routes/publicB2BSettings.routes.js";
import feedbackRoutes from "./routes/Feedback.routes.js";

import b2bVendorProductsRoutes from "./routes/b2bVendorProducts.routes.js";
import b2bVendorShopUnitRoutes from "./routes/b2bVendorShopUnit.routes.js";

import adminB2BProductManagementRoutes from "./routes/adminB2BProductManagement.routes.js";
import publicProductRoutes from "./routes/publicProduct.routes.js";
import ratingRoutes from "./routes/rating.routes.js";

import vendorAuthRoutes from "./routes/vendorAuth.routes.js";
import adminAuthRoutes from "./routes/adminAuth.routes.js";
import userAuthRoutes from "./routes/userAuth.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

import adminMediaRoutes from "./routes/media.routes.js";
import heroBannerVendorRoutes from "./routes/heroBannerVendor.routes.js";
import heroBannerAdminRoutes from "./routes/heroBannerAdmin.routes.js";
import heroBannerPublicRoutes from "./routes/heroBannerPublic.routes.js";
import adminDefaultBannerRoutes from "./routes/adminDefaultBanner.routes.js";
import publicBannerRoutes from "./routes/publicBanner.routes.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import businessTypeRoutes from "./routes/businessType.routes.js";
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

import { syncVendorViewsCron } from "./Cron/VendorViewSync.cron.js";
import bannerBookingCron from "./Cron/BannerBooking.cron.js";
import { startReelExpiryCron, startYouTubeLinkValidationCron } from "./Cron/ReelExpiry.cron.js";
import musicRoutes from "./routes/music.routes.js";
import vendorFollowRoutes from "./routes/vendorFollow.routes.js";
import adminTransactionsRoutes from "./routes/adminTransactions.routes.js";
import vendorWalletRoutes from "./routes/vendorWallet.routes.js";
import zoneRoutes from "./routes/zone.routes.js";
import staffAuthRoutes from "./routes/staffAuth.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import adminCancellationRoutes from "./routes/adminCancellation.routes.js";

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
  "http://10.141.3.211:3000",
  "http://10.141.3.211:5000",
  "https://bagferi.vercel.app",
  "https://bagferi-*.vercel.app",
  "https://www.dealingindia.com",
  "https://dealingindia.com",
  "https://www.dealingindia.in",
  "https://dealingindia.in",
  "https://bagferi.onrender.com",
  "https://bagferi.com",
  "https://www.bagferi.com",
  "https://bagferi.in",
  "https://www.bagferi.in",
];

const envOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];

const corsOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

const normalizeOrigin = (o) => (o ? o.toLowerCase().replace(/\/+$/, "") : "");

const allowedBaseDomains = [
  "dealingindia.com",
  "dealingindia.in",
  "bagferi.com",
  "bagferi.in",
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
      if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.141\.3\.211)(:\d+)?$/.test(normalized)) {
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



import groceryRoutes from "./routes/grocery.routes.js";
import adminOrderRoutes from './routes/adminOrder.routes.js';

// Routes
app.use("/api/auth/vendor", vendorAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/user", userAuthRoutes);
app.use("/api/staff/auth", staffAuthRoutes);
app.use("/api/grocery", groceryRoutes);


app.use("/api/vendors", publicVendorRoutes);
app.use("/api/public/b2b-categories", publicB2BCategoryRoutes);
app.use("/api/public", publicB2BLocationRoutes);



app.use("/api/products", publicProductRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use("/api/admin/media", adminMediaRoutes);


app.use("/api/admin/b2b-vendors", adminB2BVendorManagementRoutes);
app.use("/api/admin/b2b-categories", adminB2BCategoryManagementRoutes);
app.use("/api/admin/b2b-products", adminB2BProductManagementRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/cancellation-refunds", adminCancellationRoutes);
app.use("/api/vendor/dashboard", vendorDashboardRoutes);

app.use("/api/staff", staffRoutes);
app.use("/api/staff-auth", staffAuthRoutes);

app.use("/api/admin/b2b-settings", adminB2BSettingsRoutes);
app.use("/api/vendor/analytics", vendorAnalyticsRoutes);
app.use("/api/vendor/notifications", vendorNotificationRoutes);
app.use("/api/user/notifications", userNotificationRoutes);
app.use("/api/fcm-tokens", fcmTokenRoutes);

app.use("/api/b2b-vendor/products", b2bVendorProductsRoutes);
app.use("/api/b2b-vendor/shop-units", b2bVendorShopUnitRoutes);
app.use("/api/support-config", supportConfigRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin/referral-settings", adminReferralSettingsRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/admin/reels", adminReelRoutes);
app.use("/api/follow", vendorFollowRoutes);
app.use("/api/vendor/wallet", vendorWalletRoutes);
// Removed vendorSubscriptionRoutes mount

app.use("/api/music", musicRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/business-types", businessTypeRoutes);
app.use("/api/admin/business-settings", adminBusinessSettingsRoutes);
app.use("/api/vendor/business-settings", adminBusinessSettingsRoutes);

app.use("/api/public/b2b-settings", publicB2BSettingsRoutes);
app.use("/api/public/hero-banners", heroBannerPublicRoutes);
app.use("/api/vendor/hero-banners", heroBannerVendorRoutes);
app.use("/api/admin/hero-banners", heroBannerAdminRoutes);
app.use("/api/admin/default-banners", adminDefaultBannerRoutes);
app.use("/api/public/banners", publicBannerRoutes);
app.use("/api/brands", brandRoutes);

// Analytics
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/reports", adminDashboardRoutes);
app.use("/api/admin/transactions", adminTransactionsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/users", adminUserRoutes);

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  if (process.env.NODE_ENV !== "production") process.exit(1);
});


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


    syncVendorViewsCron.start();
    bannerBookingCron();
    startReelExpiryCron();
    startYouTubeLinkValidationCron(io);
    console.log("✅ Background Cron Jobs initialized");

    const startListening = (initialPort) => {
      let currentPort = initialPort;
      
      const tryListen = () => {
        httpServer.listen(currentPort, () => {
          console.log(`🚀 Server is running on port ${currentPort}`);
        });
      };

      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${currentPort} is busy. Trying port ${currentPort + 1}...`);
          currentPort++;
          // Close the server before listening again to avoid issues
          httpServer.close();
          tryListen();
        } else {
          console.error("❌ Failed to start server:", err);
          process.exit(1);
        }
      });

      tryListen();
    };

    startListening(PORT);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
