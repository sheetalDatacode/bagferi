import DefaultBanner from '../models/DefaultBanner.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

/**
 * Create a new default admin banner
 */
export const createDefaultBanner = asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'admin-banners');

    const banner = await DefaultBanner.create({
        title: title || '',
        image: uploadResult.secure_url,
        isActive: true
    });

    res.status(201).json({
        success: true,
        message: 'Default banner created successfully',
        data: banner
    });
});

/**
 * Get all default banners for admin management
 */
export const getDefaultBanners = asyncHandler(async (req, res) => {
    const banners = await DefaultBanner.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: banners
    });
});

/**
 * Delete a default banner
 */
export const deleteDefaultBanner = asyncHandler(async (req, res) => {
    const banner = await DefaultBanner.findById(req.params.id);

    if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Attempt to delete from Cloudinary if it's a Cloudinary URL
    if (banner.image && banner.image.includes('cloudinary')) {
        await deleteFromCloudinary(banner.image);
    }

    await DefaultBanner.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Banner deleted successfully'
    });
});

// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

/**
 * Get active banners for landing page (Priority Logic)
 * 1. If any Vendor banner is active -> Return Vendor Banners
 * 2. Else -> Return Admin Default Banners
 */
export const getActiveBannersCombined = asyncHandler(async (req, res) => {
    const now = new Date();

    // Check for active Vendor banners
    // We add 5.5 hours (330 mins) buffer to handle IST (India Time) mismatch 
    // for existing banners stored at UTC midnight.
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    const activeVendorBanners = await BannerBooking.find({
        bannerType: 'b2b',
        status: 'active',
        paymentStatus: 'paid',
        startDate: { $lte: nowWithISTBuffer },
        endDate: { $gte: now }
    })
        .populate('vendorId', 'name storeName')
        .populate('slotId', 'slotNumber')
        .lean();

    // Sort active vendor banners by slotNumber (Slot 1, then 2, etc.)
    activeVendorBanners.sort((a, b) => {
        const slotA = a.slotId?.slotNumber || 999;
        const slotB = b.slotId?.slotNumber || 999;
        return slotA - slotB;
    });

    // 2. Decide what to return
    let bannersToReturn = [];
    let bannerSource = 'VENDOR';

    if (activeVendorBanners.length > 0) {
        // We have active vendor banners, transform them
        bannersToReturn = activeVendorBanners.map(b => ({
            _id: b._id,
            title: b.title || b.vendorId?.storeName || b.vendorId?.name || 'Featured Vendor',
            image: b.bannerImage,
            link: b.link || `/b2b/vendor/${b.vendorId?._id}`,
            vendorId: b.vendorId?._id,
            slotNumber: b.slotId?.slotNumber,
            type: 'VENDOR'
        }));
    } else {
        // No vendor banners, get admin defaults
        const adminBanners = await DefaultBanner.find({ isActive: true })
            .sort({ createdAt: -1 })
            .lean();
        bannersToReturn = adminBanners.map(b => ({
            _id: b._id,
            title: b.title || 'Special Offer',
            image: b.image,
            link: '', // No redirect link for default banners as requested
            type: 'ADMIN_DEFAULT'
        }));
        bannerSource = 'ADMIN_DEFAULT';
    }

    res.status(200).json({
        success: true,
        data: {
            banners: bannersToReturn,
            source: bannerSource,
            settings: {
                universalDisplayTime: 3 // Default 3 seconds
            }
        }
    });
});
