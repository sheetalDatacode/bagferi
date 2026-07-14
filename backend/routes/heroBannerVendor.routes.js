import express from 'express';
import {
  getAvailableSlots,
  createBannerBooking,
  getMyBookings,
  confirmPayment,
  cancelBooking,
  getBookingDetails
} from '../controllers/heroBanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('vendor'));

router.get('/slots', asyncHandler(getAvailableSlots));
router.get('/my-bookings', asyncHandler(getMyBookings));
router.get('/bookings/:id', asyncHandler(getBookingDetails));
router.post('/book', upload.single('image'), asyncHandler(createBannerBooking));
router.post('/confirm-payment', asyncHandler(confirmPayment));
router.delete('/bookings/:bookingId', asyncHandler(cancelBooking));

export default router;
