import api from '../../../shared/utils/api';

/**
 * Get wallet recharge analytics
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Analytics data
 */
export const getWalletAnalytics = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const response = await api.get(`/admin/wallet/analytics?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching wallet analytics:', error);
        throw error;
    }
};

/**
 * Get all wallet transactions
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Transactions with pagination
 */
export const getWalletTransactions = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.type) queryParams.append('type', params.type);
        if (params.referenceType) queryParams.append('referenceType', params.referenceType);
        if (params.status) queryParams.append('status', params.status);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.search) queryParams.append('search', params.search);

        const response = await api.get(`/admin/wallet/transactions?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        throw error;
    }
};

/**
 * Get all vendor payout requests
 * @param {String} status - Filter status
 */
export const getAdminPayoutRequests = async (status = '') => {
    try {
        const query = status ? `?status=${status}` : '';
        const response = await api.get(`/admin/wallet/payout-requests${query}`);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch payout requests');
    } catch (error) {
        console.error('Error fetching payout requests:', error);
        throw error;
    }
};

/**
 * Approve or reject vendor payout request
 */
export const updatePayoutRequestStatus = async (requestId, status, referenceNumber = '') => {
    try {
        const response = await api.put(`/admin/wallet/payout-requests/${requestId}`, { status, referenceNumber });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to update payout request');
    } catch (error) {
        console.error('Error updating payout request:', error);
        throw error;
    }
};
