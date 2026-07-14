import ShopUnit from '../models/ShopUnit.model.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';

export const getMyUnit = async (req, res, next) => {
    try {
        const shop = await ShopUnit.findOne({ vendorId: req.user.vendorId });
        res.status(200).json({ success: true, data: shop });
    } catch (error) {
        next(error);
    }
};

export const createOrUpdateUnit = async (req, res, next) => {
    try {
        const { name, description, images, minPrice, maxPrice, details, businessCategory, mapUrl } = req.body;
        const vendorId = req.user.vendorId;

        // 1. Basic input validation
        const trimmedName = name ? name.trim() : "";
        if (!trimmedName) {
            return res.status(400).json({ success: false, message: 'Shop Name is required and cannot be empty spaces' });
        }
        if (trimmedName.length > 100) {
            return res.status(400).json({ success: false, message: 'Shop Name must be 100 characters or less' });
        }
        if (/^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(trimmedName) || !/[a-zA-Z]/.test(trimmedName)) {
            return res.status(400).json({ success: false, message: 'Shop Name must contain letters and cannot be only special characters/numbers' });
        }

        const trimmedDesc = description ? description.trim() : "";
        if (!trimmedDesc) {
            return res.status(400).json({ success: false, message: 'Description is required and cannot be empty spaces' });
        }
        if (trimmedDesc.length > 1000) {
            return res.status(400).json({ success: false, message: 'Description must be 1000 characters or less' });
        }

        if (!businessCategory || !businessCategory.trim()) {
            return res.status(400).json({ success: false, message: 'Business Category is required' });
        }

        const parsedMin = minPrice ? parseFloat(minPrice) : 0;
        const parsedMax = maxPrice ? parseFloat(maxPrice) : 0;
        if (isNaN(parsedMin) || isNaN(parsedMax) || parsedMin < 0 || parsedMax < 0) {
            return res.status(400).json({ success: false, message: 'Prices cannot be negative numbers' });
        }
        if (parsedMax < parsedMin) {
            return res.status(400).json({ success: false, message: 'Max Price cannot be less than Min Price' });
        }

        if (mapUrl && mapUrl.trim()) {
            const mapRegex = /^(https?:\/\/)?(www\.)?(google\.[a-z]+(\.[a-z]+)?\/maps|maps\.app\.goo\.gl|maps\.google\.[a-z]+)\/.*$/i;
            if (!mapRegex.test(mapUrl.trim())) {
                return res.status(400).json({ success: false, message: 'Please enter a valid Google Maps Location URL' });
            }
        }

        // 2. Validate Staff Details & Duplicate Checks
        const validDetails = (details || []).filter(d => d.name?.trim() || d.post?.trim() || d.mobile?.trim());
        if (validDetails.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one staff contact detail is required' });
        }

        const seenMobile = new Set();
        const seenName = new Set();
        for (const detail of validDetails) {
            if (!detail.name?.trim()) {
                return res.status(400).json({ success: false, message: 'Staff name is required for all added contact rows' });
            }
            if (!/^[a-zA-Z\s]+$/.test(detail.name)) {
                return res.status(400).json({ success: false, message: `Staff name "${detail.name}" should only contain alphabets` });
            }
            if (detail.post?.trim() && !/^[a-zA-Z\s]+$/.test(detail.post)) {
                return res.status(400).json({ success: false, message: `Staff post/role "${detail.post}" should only contain alphabets` });
            }
            if (!detail.mobile?.trim()) {
                return res.status(400).json({ success: false, message: `Mobile number is required for "${detail.name}"` });
            }
            if (!/^\d{10}$/.test(detail.mobile)) {
                return res.status(400).json({ success: false, message: `Mobile number for "${detail.name}" must be exactly 10 digits` });
            }

            const nameKey = detail.name.toLowerCase().trim();
            const mobileKey = detail.mobile.trim();
            if (seenMobile.has(mobileKey)) {
                return res.status(400).json({ success: false, message: 'Duplicate staff mobile numbers are not allowed' });
            }
            if (seenName.has(nameKey)) {
                return res.status(400).json({ success: false, message: 'Duplicate staff names are not allowed' });
            }
            seenMobile.add(mobileKey);
            seenName.add(nameKey);
        }

        // Ensure eligibility before listing shop
        const eligibilityCheck = await subscriptionRulesService.canListShop(vendorId);
        if (!eligibilityCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: eligibilityCheck.message,
                subscriptionRequired: true
            });
        }

        // Check for slideshow permission if more than 1 image is provided
        if (images && images.length > 1) {
            const slideshowCheck = await subscriptionRulesService.canUseShopSlideshow(vendorId);
            if (!slideshowCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: slideshowCheck.message,
                    subscriptionRequired: slideshowCheck.subscriptionRequired
                });
            }
        }

        let shop = await ShopUnit.findOne({ vendorId });

        const imageUrls = [];
        const imagePublicIds = [];

        if (images && images.length > 0) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    const result = await uploadBase64ToCloudinary(img, 'shops/b2b');
                    imageUrls.push(result.secure_url);
                    imagePublicIds.push(result.public_id);
                } else if (img.startsWith('http')) {
                    imageUrls.push(img);
                }
            }
        }

        const shopData = {
            name: trimmedName,
            description: trimmedDesc,
            details: validDetails,
            images: imageUrls,
            imagesPublicIds: imagePublicIds,
            minPrice: parsedMin,
            maxPrice: parsedMax,
            vendorId,
            businessCategory: businessCategory.trim(),
            mapUrl: mapUrl && mapUrl.trim() ? mapUrl.trim() : null,
        };

        if (shop) {
            shop = await ShopUnit.findByIdAndUpdate(shop._id, shopData, { new: true });
        } else {
            shop = await ShopUnit.create(shopData);
        }

        // Cache Invalidation for Public Vendor Profiles
        try {
            const redisService = (await import('../services/redis.service.js')).default;
            await redisService.del(`vendor:details:${vendorId}`);
            await redisService.clearPattern('vendors:list:*');
        } catch (cacheError) {
            console.error('Cache invalidation error (createOrUpdateUnit):', cacheError);
        }

        res.status(201).json({ success: true, data: shop });
    } catch (error) {
        next(error);
    }
};
