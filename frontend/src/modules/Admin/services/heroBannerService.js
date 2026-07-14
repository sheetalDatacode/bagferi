import api from '../../../shared/utils/api';

/**
 * Get banner revenue statistics/analytics
 * @param {Object} params - Query parameters (bannerType, etc.)
 */
export const getBannerRevenueStats = async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.bannerType) queryParams.append('bannerType', params.bannerType);
    if (params.params && params.params.bannerType) queryParams.append('bannerType', params.params.bannerType);

    const response = await api.get(`/admin/hero-banners/stats?${queryParams.toString()}`);
    return response;
};

/**
 * Get banner transactions list
 * @param {Object} params - Query parameters (search, limit, bannerType, etc.)
 */
export const getBannerTransactions = async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.bannerType) queryParams.append('bannerType', params.bannerType);
    if (params.params && params.params.bannerType) queryParams.append('bannerType', params.params.bannerType);

    const response = await api.get(`/admin/hero-banners/transactions?${queryParams.toString()}`);
    return response;
};

/**
 * Get specific banner transaction details
 * @param {string} transactionId
 */
export const getBannerTransactionDetails = async (transactionId) => {
    const response = await api.get(`/admin/hero-banners/transactions/${transactionId}`);
    return response;
};


/**
 * Get banner slots
 */
export const getAdminBannerSlots = async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.bannerType) queryParams.append('bannerType', params.bannerType);
    if (params.params && params.params.bannerType) queryParams.append('bannerType', params.params.bannerType);

    const response = await api.get(`/admin/hero-banners/slots?${queryParams.toString()}`);
    return response;
};

/**
 * Get banner bookings
 */
export const getAdminBannerBookings = async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.bannerType) queryParams.append('bannerType', params.bannerType);
    if (params.params && params.params.bannerType) queryParams.append('bannerType', params.params.bannerType);

    const response = await api.get(`/admin/hero-banners/bookings?${queryParams.toString()}`);
    return response;
};

/**
 * Get banner booking details for admin
 */
export const getAdminBannerBookingDetails = async (bookingId) => {
    const response = await api.get(`/admin/hero-banners/bookings/${bookingId}`);
    return response;
};

/**
 * Update banner slot details (price, display time)
 */
export const updateBannerSlot = async (slotId, data) => {
    const response = await api.patch(`/admin/hero-banners/slots/${slotId}`, data);
    return response;
};

/**
 * Update banner global settings
 */
export const updateBannerSettings = async (data) => {
    const response = await api.patch('/admin/hero-banners/settings', data);
    return response;
};

/**
 * Approve a banner booking
 */
export const approveBannerBooking = async (bookingId) => {
    const response = await api.patch(`/admin/hero-banners/bookings/${bookingId}/approve`);
    return response;
};

/**
 * Reject a banner booking
 */
export const rejectBannerBooking = async (bookingId, reason) => {
    const response = await api.patch(`/admin/hero-banners/bookings/${bookingId}/reject`, { reason });
    return response;
};
