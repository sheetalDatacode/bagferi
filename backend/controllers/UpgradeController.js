import SubscriptionService from '../services/subscription.service.js';

class UpgradeController {
    /**
     * Initialize Subscription Upgrade
     * POST /api/subscriptions/upgrade/initialize
     */
    async initializeUpgrade(req, res, next) {
        try {
            const { planId } = req.body;
            const vendorId = req.user?.vendorId || req.userDoc?._id;

            if (!vendorId) {
                return res.status(401).json({ success: false, message: 'Vendor authentication required' });
            }

            if (!planId) {
                return res.status(400).json({ success: false, message: 'New Plan ID is required' });
            }

            const result = await SubscriptionService.initializeB2BUpgrade(vendorId, planId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify Upgrade Payment
     * POST /api/subscriptions/upgrade/verify
     */
    async verifyUpgrade(req, res, next) {
        try {
            const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
            const vendorId = req.user?.vendorId || req.userDoc?._id;

            if (!vendorId) {
                return res.status(401).json({ success: false, message: 'Vendor authentication required' });
            }

            const result = await SubscriptionService.verifyB2BUpgradePayment(vendorId, planId, {
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            });

            res.status(200).json({
                success: true,
                message: 'Subscription upgraded successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new UpgradeController();
