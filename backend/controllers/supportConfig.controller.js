import SupportConfig from '../models/SupportConfig.model.js';

/**
 * Get the support configuration
 * GET /api/support-config
 */
export const getSupportConfig = async (req, res) => {
    try {
        let configs = await SupportConfig.find().sort({ updatedAt: -1 });
        
        if (configs.length > 1) {
            console.warn(`[SupportConfig] Found ${configs.length} documents. Deduping to keep latest...`);
            const keepId = configs[0]._id;
            await SupportConfig.deleteMany({ _id: { $ne: keepId } });
        }

        let config = configs[0];

        // If no config exists, create the default one
        if (!config) {
            console.log('[SupportConfig] No config found. Creating default...');
            config = await SupportConfig.create({});
        }

        // console.log(`[SupportConfig] Returning config ID: ${config._id}`);
        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('[SupportConfig] Fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching support configuration'
        });
    }
};

/**
 * Update the support configuration
 * PUT /api/admin/support-config
 */
export const updateSupportConfig = async (req, res) => {
    try {
        const { heroTitle, heroSubtitle, phone, phoneTitle, email, emailTitle, whatsapp, whatsappTitle, whatsappDesc, whatsappButtonText, faqTitle, callHours, emailResponse, faqs, instagram, facebook, youtube, userHowToVideo, vendorHowToVideo, userHowToText, vendorHowToText, userTermsAndConditions, vendorTermsAndConditions } = req.body;

        let config = await SupportConfig.findOne();

        if (config) {
            console.log('Updating Support Config with body keys:', Object.keys(req.body));
            
            // Core Header
            if (heroTitle !== undefined) config.heroTitle = heroTitle;
            if (heroSubtitle !== undefined) config.heroSubtitle = heroSubtitle;
            
            // Contact
            if (phone !== undefined) config.phone = phone;
            if (phoneTitle !== undefined) config.phoneTitle = phoneTitle;
            if (email !== undefined) config.email = email;
            if (emailTitle !== undefined) config.emailTitle = emailTitle;
            if (whatsapp !== undefined) config.whatsapp = whatsapp;
            if (whatsappTitle !== undefined) config.whatsappTitle = whatsappTitle;
            if (whatsappDesc !== undefined) config.whatsappDesc = whatsappDesc;
            if (whatsappButtonText !== undefined) config.whatsappButtonText = whatsappButtonText;
            
            // Info
            if (faqTitle !== undefined) config.faqTitle = faqTitle;
            if (callHours !== undefined) config.callHours = callHours;
            if (emailResponse !== undefined) config.emailResponse = emailResponse;
            
            // Social & Media
            if (instagram !== undefined) config.instagram = instagram;
            if (facebook !== undefined) config.facebook = facebook;
            if (youtube !== undefined) config.youtube = youtube;
            if (userHowToVideo !== undefined) config.userHowToVideo = userHowToVideo;
            if (userHowToText !== undefined) config.userHowToText = userHowToText;
            if (vendorHowToVideo !== undefined) config.vendorHowToVideo = vendorHowToVideo;
            if (vendorHowToText !== undefined) config.vendorHowToText = vendorHowToText;
            
            // Terms & Conditions (Legal) - Explicitly assign
            if (userTermsAndConditions !== undefined) config.userTermsAndConditions = userTermsAndConditions;
            if (vendorTermsAndConditions !== undefined) config.vendorTermsAndConditions = vendorTermsAndConditions;
            
            // FAQs
            if (faqs) config.faqs = faqs;

            await config.save();
            console.log('Support Config saved successfully');
        } else {
            console.log('Creating new Support Config document');
            config = await SupportConfig.create(req.body);
        }

        res.status(200).json({
            success: true,
            message: 'Support configuration updated successfully',
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating support configuration'
        });
    }
};
