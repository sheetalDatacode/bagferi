import LotSlot from '../models/LotSlot.model.js';
import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Get all Lot/Slots (Admin)
 * GET /api/admin/lot-slots
 */
export const getAllLotSlots = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;

    const query = {};

    // Search
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } }
        ];
    }

    // Status Filter
    if (status !== 'all') {
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;
    }

    // Optimize: Run count and find in parallel with lean()
    const [lotSlots, total] = await Promise.all([
        LotSlot.find(query)
            .populate('vendorId', 'name storeName email vendorType')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean(),
        LotSlot.countDocuments(query)
    ]);

    // Format for response
    const formattedLotSlots = lotSlots.map(slot => ({
        _id: slot._id,
        name: slot.name,
        sku: slot.sku,
        price: slot.price,
        moq: slot.moq,
        image: slot.image,
        isActive: slot.isActive,
        vendor: slot.vendorId ? {
            name: slot.vendorId.storeName || slot.vendorId.name,
            email: slot.vendorId.email,
            type: slot.vendorId.vendorType
        } : null,
        createdAt: slot.createdAt
    }));

    res.status(200).json({
        success: true,
        data: formattedLotSlots,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get Lot/Slot By ID (Admin)
 * GET /api/admin/lot-slots/:id
 */
export const getLotSlotById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lotSlot = await LotSlot.findById(id).populate('vendorId', 'name storeName email phone vendorType');

    if (!lotSlot) {
        return res.status(404).json({ success: false, message: 'Lot/Slot not found' });
    }

    res.status(200).json({
        success: true,
        data: lotSlot
    });
});

/**
 * Update Lot/Slot Status (Admin)
 * PATCH /api/admin/lot-slots/:id/status
 */
export const updateLotSlotStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const lotSlot = await LotSlot.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    );

    if (!lotSlot) {
        return res.status(404).json({ success: false, message: 'Lot/Slot not found' });
    }

    res.status(200).json({
        success: true,
        message: `Lot/Slot ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: lotSlot
    });
});
