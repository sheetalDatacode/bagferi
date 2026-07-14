import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// @desc    Get all active business types
// @route   GET /api/business-types
// @access  Public
export const getActiveBusinessTypes = asyncHandler(async (req, res) => {
    const businessTypesRaw = await BusinessType.find({ isActive: true }).lean();

    // Fetch settings for all these business types
    const settings = await BusinessTypeSettings.find({
        businessTypeId: { $in: businessTypesRaw.map(bt => bt._id) }
    }).lean();

    const businessTypes = businessTypesRaw.map(bt => {
        const btSettings = settings.find(s => s.businessTypeId.toString() === bt._id.toString());
        const { subTypes, ...rest } = bt;
        return {
            ...rest,
            settings: btSettings || null
        };
    });

    res.status(200).json({
        success: true,
        data: businessTypes,
    });
});

// @desc    Admin: Create business type
// @route   POST /api/admin/business-types
// @access  Admin
export const createBusinessType = asyncHandler(async (req, res) => {
    let { name, slug, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }

    name = name.trim();
    if (description) description = description.trim();

    if (/^\d+$/.test(name)) {
        return res.status(400).json({ success: false, message: 'Name cannot be only numbers' });
    }

    if (!/[a-zA-Z]/.test(name)) {
        return res.status(400).json({ success: false, message: 'Name must contain letters' });
    }

    const hasHTML = /<[^>]*>?/gm;
    if (hasHTML.test(name) || (description && hasHTML.test(description))) {
        return res.status(400).json({ success: false, message: 'HTML tags are not allowed' });
    }

    if (name.length > 50) {
        return res.status(400).json({ success: false, message: 'Name must be 50 characters or less' });
    }
    
    if (description && description.length > 200) {
        return res.status(400).json({ success: false, message: 'Description must be 200 characters or less' });
    }

    const businessType = await BusinessType.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        subTypes: []
    });

    // Create default settings for this business type
    await BusinessTypeSettings.create({
        businessTypeId: businessType._id,
        enabledModules: ['subscription', 'profile', 'settings'], // Minimal defaults
        propertyForms: ['property', 'flat', 'villa', 'plot'],
    });

    res.status(201).json({
        success: true,
        data: businessType,
    });
});

// @desc    Admin: Update business type
// @route   PUT /api/admin/business-types/:id
// @access  Admin
export const updateBusinessType = asyncHandler(async (req, res) => {
    // Do not allow updating subTypes; strip if present
    const update = { ...req.body };
    if (update.subTypes !== undefined) delete update.subTypes;
    const businessType = await BusinessType.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
    });

    if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
    }

    res.status(200).json({
        success: true,
        data: businessType,
    });
});

// @desc    Admin: Delete business type and its settings
// @route   DELETE /api/admin/business-types/:id
// @access  Admin
export const deleteBusinessType = asyncHandler(async (req, res) => {
    const businessTypeId = req.params.id;

    const businessType = await BusinessType.findById(businessTypeId);
    if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
    }

    // Prevent deleting if any vendor is still linked to this business type
    const linkedVendor = await Vendor.exists({ businessTypeRef: businessTypeId });
    if (linkedVendor) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete: at least one vendor is using this business type. Please reassign vendors first.',
        });
    }

    await BusinessTypeSettings.findOneAndDelete({ businessTypeId });
    await BusinessType.findByIdAndDelete(businessTypeId);

    res.status(200).json({
        success: true,
        message: 'Business type and its settings deleted successfully',
    });
});
