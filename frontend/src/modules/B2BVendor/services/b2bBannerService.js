import api from '../../../shared/utils/api';

/**
 * Get available banner slots for B2B vendors
 */
export const getAvailableBannerSlots = async () => {
  const response = await api.get('/vendor/hero-banners/slots', {
    params: { bannerType: 'b2b' }
  });
  return response;
};

/**
 * Get B2B vendor's own banner bookings
 */
export const getMyBannerBookings = async () => {
  const response = await api.get('/vendor/hero-banners/my-bookings', {
    params: { bannerType: 'b2b' }
  });
  return response;
};

/**
 * Get B2B vendor's booking details
 * @param {string} bookingId
 */
export const getVendorBannerBookingDetails = async (bookingId) => {
  const response = await api.get(`/vendor/hero-banners/bookings/${bookingId}`);
  return response;
};

/**
 * Create a new banner booking for B2B vendor
 * @param {FormData} formData - Booking data including image
 */
export const createBannerBooking = async (formData) => {
  const response = await api.post('/vendor/hero-banners/book', formData);
  return response;
};

/**
 * Confirm banner booking payment
 * @param {Object} paymentData - { bookingId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentMethod }
 */
export const confirmBannerPayment = async (paymentData) => {
  const response = await api.post('/vendor/hero-banners/confirm-payment', paymentData);
  return response;
};

/**
 * Cancel/Delete an unpaid booking
 * @param {string} bookingId
 */
export const cancelBannerBooking = async (bookingId) => {
  const response = await api.delete(`/vendor/hero-banners/bookings/${bookingId}`);
  return response;
};
