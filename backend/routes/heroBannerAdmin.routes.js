import express from 'express';
import {
    getBannerRevenueStats,
    getBannerTransactions,
    getBannerTransactionDetails,
    getAdminBannerSlots,
    getAdminBannerBookings,
    getAdminBannerBookingDetails,
    updateBannerSlot,
    updateBannerSettings,
    approveBannerBooking,
    rejectBannerBooking
} from '../controllers/heroBanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Analytics & Transactions
router.get('/stats', asyncHandler(getBannerRevenueStats));
router.get('/transactions', asyncHandler(getBannerTransactions));
router.get('/transactions/:id', asyncHandler(getBannerTransactionDetails));

// Slots Management
router.get('/slots', asyncHandler(getAdminBannerSlots));
router.patch('/slots/:id', asyncHandler(updateBannerSlot));

// Bookings Management
router.get('/bookings', asyncHandler(getAdminBannerBookings));
router.get('/bookings/:id', asyncHandler(getAdminBannerBookingDetails));
router.patch('/bookings/:id/approve', asyncHandler(approveBannerBooking));
router.patch('/bookings/:id/reject', asyncHandler(rejectBannerBooking));

// Settings
router.patch('/settings', asyncHandler(updateBannerSettings));

export default router;
