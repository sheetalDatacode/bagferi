/**
 * B2B Vendor Subscription Service
 * Handles subscription API calls for B2B vendors
 */

import api from '../../../shared/utils/api';

/**
 * Get active subscription plans
 * @returns {Promise<Array>} List of active subscription plans
 */
export const getPlans = async () => {
    try {
        const response = await api.get('/public/b2b-subscription-plans/active');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch plans');
    } catch (error) {
        console.error('Error fetching B2B plans:', error);
        throw error;
    }
};

/**
 * Get current vendor subscription
 * @returns {Promise<Object|null>} Current subscription or null
 */
export const getCurrentSubscription = async () => {
    try {
        const response = await api.get('/subscription/getB2BSubscription');
        if (response.success) {
            // Return the first active subscription if exists
            const activeSubscription = response.subscriptions?.find(
                (sub) => sub.status === 'active'
            );
            return activeSubscription || null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching current subscription:', error);
        // If 404 or no subscription, return null
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Create a new subscription
 * @param {String} planId - Plan ID to subscribe to
 * @returns {Promise<Object>} Full response with subscription and razorpay data
 */
export const createSubscription = async (planId) => {
    try {
        const response = await api.post('/subscription/createB2BSubscription', { planId });
        if (response.success) {
            return response;
        }
        throw new Error(response.message || 'Failed to create subscription');
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
};

/**
 * Verify subscription payment
 * @param {Object} paymentData - Razorpay payment data
 */
export const verifyPayment = async (paymentData) => {
    try {
        const response = await api.post('/subscription/verifyB2BPayment', paymentData);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Payment verification failed');
    } catch (error) {
        console.error('Error verifying payment:', error);
        throw error;
    }
};

/**
 * Get all vendor subscriptions (active and cancelled)
 * @returns {Promise<Array>} List of subscriptions
 */
export const getAllSubscriptions = async () => {
    try {
        const response = await api.get('/subscription/getB2BSubscription');
        if (response.success) {
            return response.subscriptions || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching all subscriptions:', error);
        return [];
    }
};

/**
 * Cancel a subscription
 * @param {String} subscriptionId - Subscription ID to cancel
 * @returns {Promise<Object>} Cancellation response
 */
export const cancelSubscription = async (subscriptionId) => {
    try {
        const response = await api.patch(`/subscription/cancelB2BSubscription/${subscriptionId}`);
        if (response.success) {
            return response;
        }
        throw new Error(response.message || 'Failed to cancel subscription');
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};

/**
 * Get subscription details by ID
 * @param {String} subscriptionId - Subscription ID to fetch details for
 * @returns {Promise<Object>} Subscription details including Razorpay info
 */
export const getSubscriptionDetails = async (subscriptionId) => {
    try {
        const response = await api.get(`/subscription/getB2BSubscription/${subscriptionId}`);
        if (response.success) {
            return {
                subscription: response.subscription,
                razorpayDetails: response.razorpayDetails,
            };
        }
        throw new Error(response.message || 'Failed to fetch subscription details');
    } catch (error) {
        console.error('Error fetching subscription details:', error);
        throw error;
    }
};

/**
 * Initialize subscription upgrade
 * @param {String} planId - New Plan ID to upgrade to
 */
export const initializeUpgrade = async (planId) => {
    try {
        const response = await api.post('/subscriptions/upgrade/initialize', { planId });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to initialize upgrade');
    } catch (error) {
        console.error('Error initializing upgrade:', error);
        throw error;
    }
};

/**
 * Verify upgrade payment
 * @param {Object} verifyData - Payment verification data
 */
export const verifyUpgradePayment = async (verifyData) => {
    try {
        const response = await api.post('/subscriptions/upgrade/verify', verifyData);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Upgrade verification failed');
    } catch (error) {
        console.error('Error verifying upgrade:', error);
        throw error;
    }
};

/**
 * Get available addon plans for vendor
 */
export const getAddonPlans = async (featureType) => {
    try {
        const params = featureType ? { featureType } : {};
        const response = await api.get('/vendor/addons/available', { params });
        if (response.success) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching addon plans:', error);
        return [];
    }
};

/**
 * Initialize addon purchase
 */
export const initializeAddonPurchase = async (planId, quantity = 1) => {
    try {
        const response = await api.post('/vendor/addons/initialize', { addonPlanId: planId, quantity });
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to initialize addon purchase');
    } catch (error) {
        console.error('Error initializing addon purchase:', error);
        throw error;
    }
};

/**
 * Verify addon payment
 */
export const verifyAddonPayment = async (paymentData) => {
    try {
        const response = await api.post('/vendor/addons/verify', paymentData);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || 'Addon payment verification failed');
    } catch (error) {
        console.error('Error verifying addon payment:', error);
        throw error;
    }
};

/**
 * Get current addon usage/status
 */
export const getAddonStatus = async () => {
    try {
        const response = await api.get('/vendor/addons/status');
        if (response.success) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching addon status:', error);
        return null;
    }
};

/**
 * Get recent addon purchase history
 */
export const getAddonHistory = async () => {
    try {
        const response = await api.get('/vendor/addons/history');
        if (response.success) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching addon history:', error);
        return [];
    }
};
 
/**
 * Get vendor billing history
 * @returns {Promise<Array>} List of billing transactions
 */
export const getBillingHistory = async () => {
    try {
        const response = await api.get('/vendor/subscription/billing-history');
        if (response.success) {
            return response.data || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching billing history:', error);
        return [];
    }
};

/**
 * Download invoice PDF
 * @param {String} invoiceId - Zoho Invoice ID
 */
export const downloadInvoice = async (invoiceId) => {
    try {
        // We use window.open for direct download if the API handles it
        const url = `${api.defaults.baseURL}/vendor/subscription/invoice/${invoiceId}`;
        const token = localStorage.getItem('b2b-vendor-token');
        
        // Fetch the blob to handle authentication and direct download
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to download invoice');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `invoice-${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Error downloading invoice:', error);
        throw error;
    }
};

export default {
    getPlans,
    getCurrentSubscription,
    createSubscription,
    getAllSubscriptions,
    cancelSubscription,
    getSubscriptionDetails,
    verifyPayment,
    initializeUpgrade,
    verifyUpgradePayment,
    getAddonPlans,
    initializeAddonPurchase,
    verifyAddonPayment,
    getAddonStatus,
    getAddonHistory,
    getBillingHistory,
    downloadInvoice
};
