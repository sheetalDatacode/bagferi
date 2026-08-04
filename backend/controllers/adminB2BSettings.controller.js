import B2BSettings from '../models/B2BSettings.model.js';

class AdminB2BSettingsController {
    /**
     * Get B2B global settings
     * GET /admin/b2b-settings
     */
    async getSettings(req, res) {
        try {
            // Sort by createdAt descending to get the latest if multiples exist
            let settings = await B2BSettings.findOne();
            
            if (!settings) {
                // Initialize with defaults if not exists
                settings = await B2BSettings.create({ 
                    defaultEnquiryPrice: 1,
                    advancePaymentAmount: 200,
                    advancePaymentCommissionPercentage: 0,
                    homeFeatures: [
                        { title: 'Advance payment 200 fix', subtitle: '', iconName: 'FiCreditCard', isActive: true },
                        { title: 'Only exchange', subtitle: 'Exchange Shop pr hoga Platform pr nhi', iconName: 'FiRefreshCw', isActive: true },
                        { title: 'Free delivery', subtitle: '', iconName: 'FiPackage', isActive: true }
                    ]
                });
            } else if (!settings.homeFeatures || settings.homeFeatures.length === 0) {
                settings.homeFeatures = [
                    { title: 'Advance payment 200 fix', subtitle: '', iconName: 'FiCreditCard', isActive: true },
                    { title: 'Only exchange', subtitle: 'Exchange Shop pr hoga Platform pr nhi', iconName: 'FiRefreshCw', isActive: true },
                    { title: 'Free delivery', subtitle: '', iconName: 'FiPackage', isActive: true }
                ];
                await settings.save();
            }

            res.status(200).json({
                success: true,
                data: settings,
                message: 'B2B settings fetched successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch B2B settings'
            });
        }
    }

    /**
     * Update B2B global settings
     * POST /admin/b2b-settings
     */
    async updateSettings(req, res) {
        try {
            const adminId = req.userDoc?._id || req.user?.adminId || req.user?.id;
            const { defaultEnquiryPrice, enableVideoFileUpload, homeFeatures, advancePaymentAmount, advancePaymentCommissionPercentage } = req.body;

            const update = {};
            if (defaultEnquiryPrice !== undefined) update.defaultEnquiryPrice = defaultEnquiryPrice;
            if (advancePaymentAmount !== undefined) update.advancePaymentAmount = advancePaymentAmount;
            if (advancePaymentCommissionPercentage !== undefined) update.advancePaymentCommissionPercentage = advancePaymentCommissionPercentage;
            if (enableVideoFileUpload !== undefined) update.enableVideoFileUpload = enableVideoFileUpload;
            if (homeFeatures !== undefined) update.homeFeatures = homeFeatures;
            update.updatedBy = adminId;

            const settings = await B2BSettings.findOneAndUpdate(
                {}, // Target the only settings doc
                update,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            res.status(200).json({
                success: true,
                data: settings,
                message: 'B2B settings updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update B2B settings'
            });
        }
    }
}

export default new AdminB2BSettingsController();
