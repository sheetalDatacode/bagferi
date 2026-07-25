import SubscriptionService from '../services/b2bSubscriptionPlan.service.js';

/**
 * B2B-Only Subscription Controller
 */

export const getAllB2BPlans = async (req, res, next) => {
    try {
        const plans = await SubscriptionService.getAllPlans(); // Changed from getAllTiers
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
};

export const createB2BSubscription = async (req, res, next) => {
    try {
        const { planId } = req.body;
        const vendorId = req.user?.vendorId || req.user?.id;
        const result = SubscriptionService.initializeSubscription ? await SubscriptionService.initializeSubscription(vendorId, planId, req.app.get('io')) : {};
        res.status(200).json({
            success: true,
            subscription: result?.subscription || null,
            razorpay: result?.razorpay || null,
            razorpayKeyId: result?.razorpayKeyId || null
        });
    } catch (error) {
        next(error);
    }
};

export const getB2BSubscription = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const subscription = SubscriptionService.getVendorSubscription ? await SubscriptionService.getVendorSubscription(vendorId) : null;
        res.status(200).json({
            success: true,
            subscriptions: subscription ? [subscription] : []
        });
    } catch (error) {
        next(error);
    }
};

export const getAllB2BSubscriptions = async (req, res, next) => {
    try {
        const { status, planId, expiringSoon } = req.query;
        const subscriptions = SubscriptionService.getAllVendorSubscriptions ? await SubscriptionService.getAllVendorSubscriptions({ status, planId, expiringSoon }) : [];
        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        next(error);
    }
};

export const getB2BAnalytics = async (req, res, next) => {
    try {
        const analytics = SubscriptionService.getSubscriptionAnalytics ? await SubscriptionService.getSubscriptionAnalytics() : {};
        res.status(200).json({ success: true, ...analytics });
    } catch (error) {
        next(error);
    }
};

export const manualOverride = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const { action, details } = req.body;
        const adminId = req.user.id;
        const result = SubscriptionService.manualSubscriptionOverride ? await SubscriptionService.manualSubscriptionOverride(subscriptionId, action, adminId, details) : null;
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getB2BSubscriptionDetails = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        // Basic implementation
        res.status(200).json({ success: true, data: { id: subscriptionId } });
    } catch (error) {
        next(error);
    }
};

export const cancelB2BSubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const vendorId = req.user?.role === 'admin' ? null : (req.user?.vendorId || req.user?.id);
        const result = SubscriptionService.cancelB2BSubscription ? await SubscriptionService.cancelB2BSubscription(subscriptionId, vendorId) : null;
        res.status(200).json({ success: true, message: 'Subscription cancelled successfully', data: result });
    } catch (error) {
        next(error);
    }
};

export const razorpayWebhook = async (req, res, next) => {
    try {
        console.log('Razorpay Webhook received');
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        next(error);
    }
};

import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';

export const getBillingHistory = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const transactions = await VendorWalletTransaction.find({
            vendorId,
            referenceType: { $in: ['subscription_plan', 'recharge', 'addon_plan', 'banner_booking'] }
        }).sort({ createdAt: -1 }).lean();

        const billingHistory = transactions.map(t => ({
            id: t._id,
            date: t.createdAt,
            amount: t.amount,
            description: t.description || (t.type === 'credit' ? 'Wallet Recharge' : 'Plan Subscription'),
            status: 'Paid',
            invoiceUrl: t.zohoInvoicePdfUrl || null
        }));

        res.status(200).json({
            success: true,
            data: billingHistory
        });
    } catch (error) {
        next(error);
    }
};

