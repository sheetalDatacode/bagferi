import SubscriptionService from '../services/subscription.service.js';

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
        const result = await SubscriptionService.initializeSubscription(vendorId, planId, req.app.get('io'));
        res.status(200).json({
            success: true,
            subscription: result.subscription,
            razorpay: result.razorpay,
            razorpayKeyId: result.razorpayKeyId
        });
    } catch (error) {
        next(error);
    }
};

export const getB2BSubscription = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const subscription = await SubscriptionService.getVendorSubscription(vendorId);
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
        const subscriptions = await SubscriptionService.getAllVendorSubscriptions({ status, planId, expiringSoon });
        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        next(error);
    }
};

export const getB2BAnalytics = async (req, res, next) => {
    try {
        const analytics = await SubscriptionService.getSubscriptionAnalytics();
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
        const result = await SubscriptionService.manualSubscriptionOverride(subscriptionId, action, adminId, details);
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
        const result = await SubscriptionService.cancelB2BSubscription(subscriptionId, vendorId);
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

