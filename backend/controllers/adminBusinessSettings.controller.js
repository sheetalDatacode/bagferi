import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import BusinessType from '../models/BusinessType.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

// @desc    Admin: Get all business settings
// @route   GET /api/admin/business-settings
// @access  Admin
export const getAllBusinessSettings = asyncHandler(async (req, res) => {
    const settings = await BusinessTypeSettings.find()
        .populate('businessTypeId')
        .populate('allowedAddonPlans');

    // Strip legacy subTypes field from populated BusinessType before sending to client
    const sanitized = settings.map((doc) => {
        const obj = doc.toObject();
        if (obj.businessTypeId && obj.businessTypeId.subTypes !== undefined) {
            delete obj.businessTypeId.subTypes;
        }
        return obj;
    });

    res.status(200).json({
        success: true,
        data: sanitized,
    });
});

// @desc    Admin: Update business settings
// @route   PUT /api/admin/business-settings/update/:id
// @access  Admin
export const updateBusinessSettings = asyncHandler(async (req, res) => {
    const {
        enabledModules,
        features,
        isActive,
        dashboardWidgets,
        allowedPlans,
        allowedAddonPlans,
        productFormType,
        enableShopListing,
        propertyForms
    } = req.body;

    let settings = await BusinessTypeSettings.findById(req.params.id);

    if (!settings) {
        return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    // settings.enabledModules = enabledModules || settings.enabledModules;
    settings.enabledModules =
        enabledModules !== undefined
            ? enabledModules
            : settings.enabledModules;

    settings.features = features || settings.features;
    settings.dashboardWidgets = dashboardWidgets !== undefined ? dashboardWidgets : settings.dashboardWidgets;
    settings.allowedPlans = allowedPlans !== undefined ? allowedPlans : settings.allowedPlans;
    settings.allowedAddonPlans = allowedAddonPlans !== undefined ? allowedAddonPlans : settings.allowedAddonPlans;
    settings.isActive = isActive !== undefined ? isActive : settings.isActive;
    settings.productFormType = productFormType !== undefined ? productFormType : settings.productFormType;
    settings.enableShopListing = enableShopListing !== undefined ? enableShopListing : settings.enableShopListing;
    if (propertyForms !== undefined) {
        settings.propertyForms = Array.isArray(propertyForms)
            ? propertyForms.map((f) => String(f).toLowerCase().trim())
            : [];
    } else {
        settings.propertyForms = Array.isArray(settings.propertyForms) ? settings.propertyForms : [];
    }

    await settings.save();

    // Also update BusinessType if needed (name, description)
    if (req.body.businessTypeId && typeof req.body.businessTypeId === 'object') {
        const btUpdates = {};
        if (req.body.businessTypeId.name) btUpdates.name = req.body.businessTypeId.name;
        if (req.body.businessTypeId.description) btUpdates.description = req.body.businessTypeId.description;

        if (Object.keys(btUpdates).length > 0) {
            await BusinessType.findByIdAndUpdate(settings.businessTypeId, btUpdates);
        }
    }

    // Clear plan cache so vendors see updated plan availability
    try {
        await redisService.clearPattern('public:b2b-plans:*');
    } catch (cacheError) {
        console.error('Error clearing cache in updateBusinessSettings:', cacheError);
    }

    const updatedSettingsDoc = await BusinessTypeSettings.findById(settings._id)
        .populate('businessTypeId')
        .populate('allowedAddonPlans');
    const updatedSettings = updatedSettingsDoc.toObject();
    if (updatedSettings.businessTypeId && updatedSettings.businessTypeId.subTypes !== undefined) {
        delete updatedSettings.businessTypeId.subTypes;
    }

    res.status(200).json({
        success: true,
        data: updatedSettings,
    });
});

// @desc    Admin: Get settings by Business Type Slug
// @route   GET /api/admin/business-settings/:slug
// @access  Admin/Vendor
export const getSettingsBySlug = asyncHandler(async (req, res) => {
    const businessType = await BusinessType.findOne({ slug: req.params.slug });
    if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
    }

    const settingsDoc = await BusinessTypeSettings.findOne({ businessTypeId: businessType._id }).populate('allowedAddonPlans');
    const settings = settingsDoc ? settingsDoc.toObject() : null;
    const bt = businessType.toObject();
    if (bt.subTypes !== undefined) {
        delete bt.subTypes;
    }

    res.status(200).json({
        success: true,
        data: settings,
        businessType: bt
    });
});
