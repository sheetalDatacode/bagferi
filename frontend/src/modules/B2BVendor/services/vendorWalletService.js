/**
 * B2B Vendor Wallet Service
 * Handles wallet-related API calls
 */

import api from '../../../shared/utils/api';

/**
 * Get wallet balance and transactions
 */
export const getMyWallet = async () => {
    try {
        const response = await api.get('/vendor/wallet');
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch wallet data');
    } catch (error) {
        console.error('Error fetching wallet:', error);
        throw error;
    }
};

/**
 * Initiate wallet recharge (Create Razorpay Order)
 * @param {Number} amount - Amount in INR
 */
export const initiateRecharge = async (amount) => {
    try {
        const response = await api.post('/vendor/wallet/recharge/initiate', { amount });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to initiate recharge');
    } catch (error) {
        console.error('Error initiating recharge:', error);
        throw error;
    }
};

/**
 * Verify wallet recharge payment
 * @param {Object} paymentData - Razorpay response
 */
export const verifyRecharge = async (paymentData) => {
    try {
        const response = await api.post('/vendor/wallet/recharge/verify', paymentData);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Recharge verification failed');
    } catch (error) {
        console.error('Error verifying recharge:', error);
        throw error;
    }
};

/**
 * Purchase addon unit using wallet balance
 * @param {String} addonPlanId 
 * @param {Number} quantity
 */
export const purchaseAddonViaWallet = async (addonPlanId, quantity = 1) => {
    try {
        const response = await api.post('/vendor/addons/purchase-wallet', { addonPlanId, quantity });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Wallet purchase failed');
    } catch (error) {
        console.error('Error purchasing addon via wallet:', error);
        throw error;
    }
};

/**
 * Purchase subscription using wallet balance
 * @param {String} planId 
 */
export const purchaseSubscriptionViaWallet = async (planId) => {
    try {
        const response = await api.post('/vendor/subscriptions/purchase-wallet', { planId });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Wallet subscription purchase failed');
    } catch (error) {
        console.error('Error purchasing subscription via wallet:', error);
        throw error;
    }
};

export default {
    getMyWallet,
    initiateRecharge,
    verifyRecharge,
    purchaseAddonViaWallet,
    purchaseSubscriptionViaWallet
};
