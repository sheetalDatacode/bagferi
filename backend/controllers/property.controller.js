import Property from '../models/Property.model.js';
import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import VendorPropertySubscription from '../models/VendorPropertySubscription.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary, isBase64DataUrl } from '../utils/cloudinary.util.js';
import ShopUnit from '../models/ShopUnit.model.js';
import vendorAddonService from '../services/vendorAddon.service.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';

const DEFAULT_FLAT_DETAILS = {
    flatType: '2BHK',
    builtUpArea: 0,
    commonArea: 0,
    possessionType: 'Ready to Move',
    carpetAreaUnit: 'Sq. Ft.',
    floorNumber: 0,
    totalFloors: 0,
    furnishing: 'Unfurnished',
    ageOfProperty: 'New',
    amenities: {
        lift: 'No',
        parking: ['Ground Parking'],
        security: 'No',
        cctv: 'No',
        powerBackup: 'No',
        waterSupply: ['Municipal'],
        gasPipeline: 'No',
        swimmingPool: 'No',
        gym: 'No',
        garden: 'No',
        childrenPlayArea: 'No',
        clubHouse: 'No',
        temple: 'No',
        societyOffice: 'No',
        gameZone: 'No'
    },
    legal: {
        loanAvailable: 'No',
        reraApproved: 'No',
        maintenanceCharges: '',
        propertyTaxStatus: ''
    }
};
const sanitizeFlatVariant = (variant = {}) => {
    const num = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        const parsed = parseFloat(v);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
        ...DEFAULT_FLAT_DETAILS,
        ...variant,
        builtUpArea: num(variant.builtUpArea),
        commonArea: num(variant.commonArea),
        floorNumber: num(variant.floorNumber),
        totalFloors: num(variant.totalFloors),
        amenities: {
            ...DEFAULT_FLAT_DETAILS.amenities,
            ...(variant.amenities || {})
        },
        legal: {
            ...DEFAULT_FLAT_DETAILS.legal,
            ...(variant.legal || {})
        }
    };
};

const DEFAULT_PLOT_DETAILS = {
    plotArea: 0,
    plotAreaUnit: 'Sq. Ft.',
    builtUpArea: 0,
    commonArea: 0,
    possessionType: 'Ready to Move',
    builtUpAreaUnit: 'Sq. Ft.',
    floors: 'G+1',
    masterRoom: 'No',
    bedrooms: 0,
    bathrooms: 0,
    balcony: 0,
    terrace: 'No',
    furnishing: 'Unfurnished',
    ageOfProperty: 'New',
    privateFacilities: {
        privateParking: 'No',
        gardenArea: 'No',
        personalBorewell: 'No',
        solarSystem: 'No',
        storeRoom: 'No',
        servantRoom: 'No'
    },
    amenities: {
        parking: ['Ground Parking'],
        security: 'No',
        cctv: 'No',
        powerBackup: 'No',
        waterSupply: ['Municipal'],
        gasPipeline: 'No',
        swimmingPool: 'No',
        gym: 'No',
        garden: 'No',
        childrenPlayArea: 'No',
        clubHouse: 'No',
        temple: 'No',
        societyOffice: 'No',
        gameZone: 'No'
    },
    legal: {
        loanAvailable: 'No',
        reraApproved: 'No',
        maintenanceCharges: '',
        propertyTaxStatus: ''
    }
};

const DEFAULT_FACILITIES = {
    parking: ['No'],
    lift: 'No',
    liftPassenger: 'No',
    liftLoading: 'No',
    powerBackup: 'No',
    waterSupply: [],
    washroom: ['Common'],
    fireSafety: 'No'
};

const DEFAULT_STATUS = {
    furnishing: 'Unfurnished',
    propertyStatus: 'Ready',
    propertyCondition: 'New',
    propertyPosition: 'Ready to Move'
};

const DEFAULT_COMMERCIAL_LEGAL = {
    loanAvailable: 'No',
    reraApproved: 'No',
    load: ''
};

/**
 * Helper function to process media uploads to Cloudinary
 * @param {Array} mediaArray - Array of media objects with url field (base64 or existing URL)
 * @returns {Promise<Array>} - Array of processed media objects with Cloudinary URLs
 */
const processMediaUploads = async (mediaArray) => {
    if (!mediaArray || !Array.isArray(mediaArray) || mediaArray.length === 0) {
        return [];
    }

    const processedMedia = [];

    for (const mediaItem of mediaArray) {
        try {
            // If it's already a Cloudinary URL or other HTTP URL, keep it as is
            if (mediaItem.url && mediaItem.url.startsWith('http')) {
                processedMedia.push({
                    url: mediaItem.url,
                    publicId: mediaItem.publicId || null,
                    uploadedAt: mediaItem.uploadedAt || new Date()
                });
                continue;
            }

            // If it's base64 data, upload to Cloudinary
            if (mediaItem.url && isBase64DataUrl(mediaItem.url)) {
                const uploadResult = await uploadBase64ToCloudinary(
                    mediaItem.url,
                    'properties' // Folder name in Cloudinary
                );

                if (uploadResult && uploadResult.secure_url) {
                    processedMedia.push({
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        uploadedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('[Property Media Upload Error]:', error.message);
            // Skip failed uploads but continue with others
        }
    }

    return processedMedia;
};

// @desc    Add new property
// @route   POST /api/property/add
// @access  Vendor
export const addProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;

    // Get maxImages from subscription middleware (set based on business type)
    // Developer: 50 images, Broker: 5 images
    const maxImages = req.subscriptionLimits?.property?.maxImages || 50;

    const { media } = req.body;
    if (maxImages !== -1 && media && media.length > maxImages) {
        return res.status(400).json({
            success: false,
            message: `Image limit exceeded. Maximum ${maxImages} images allowed for your subscription.`
        });
    }

    // Process media uploads to Cloudinary
    let processedMedia = [];
    if (media && media.length > 0) {
        processedMedia = await processMediaUploads(media);

        if (processedMedia.length === 0 && media.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to upload images. Please try again.'
            });
        }
    }

    // Link ShopUnit automatically
    const shopUnit = await ShopUnit.findOne({ vendorId }).select('_id').lean();

    const propertyData = {
        ...req.body,
        media: processedMedia,
        vendorId,
        shopUnitId: shopUnit ? shopUnit._id : (req.body.shopUnitId || null)
    };

    // Persist defaults at creation time so detail views always have explicit values.
    propertyData.location = {
        ...(propertyData.location || {}),
        mapUrl: String(propertyData?.location?.mapUrl || '').trim()
    };
    propertyData.flatDetails = {
        ...DEFAULT_FLAT_DETAILS,
        ...(propertyData.flatDetails || {}),
        amenities: {
            ...DEFAULT_FLAT_DETAILS.amenities,
            ...((propertyData.flatDetails || {}).amenities || {})
        },
        legal: {
            ...DEFAULT_FLAT_DETAILS.legal,
            ...((propertyData.flatDetails || {}).legal || {})
        }
    };
    const normalizedFlatVariants = Array.isArray(req.body.flatVariants)
        ? req.body.flatVariants
            .map(sanitizeFlatVariant)
            .filter(v => String(v.flatType || '').trim() !== '')
        : [];
    if (normalizedFlatVariants.length > 0) {
        propertyData.flatVariants = normalizedFlatVariants;
        propertyData.flatDetails = {
            ...propertyData.flatDetails,
            ...normalizedFlatVariants[0]
        };
    } else if (String(propertyData.flatDetails?.flatType || '').trim() !== '') {
        propertyData.flatVariants = [sanitizeFlatVariant(propertyData.flatDetails)];
    }
    propertyData.plotDetails = {
        ...DEFAULT_PLOT_DETAILS,
        ...(propertyData.plotDetails || {}),
        privateFacilities: {
            ...DEFAULT_PLOT_DETAILS.privateFacilities,
            ...((propertyData.plotDetails || {}).privateFacilities || {})
        },
        amenities: {
            ...DEFAULT_PLOT_DETAILS.amenities,
            ...((propertyData.plotDetails || {}).amenities || {})
        },
        legal: {
            ...DEFAULT_PLOT_DETAILS.legal,
            ...((propertyData.plotDetails || {}).legal || {})
        }
    };
    propertyData.facilities = {
        ...DEFAULT_FACILITIES,
        ...(propertyData.facilities || {})
    };
    propertyData.status = {
        ...DEFAULT_STATUS,
        ...(propertyData.status || {})
    };
    propertyData.legal = {
        ...DEFAULT_COMMERCIAL_LEGAL,
        ...(propertyData.legal || {})
    };

    // Compatibility: allow "Villa" from new UI even when runtime enum still has only "Plot".
    const enumValues = Property.schema.path('propertyType')?.enumValues || [];
    if (
        String(propertyData.propertyType || '').toLowerCase() === 'villa' &&
        !enumValues.includes('Villa') &&
        enumValues.includes('Plot')
    ) {
        propertyData.propertyType = 'Plot';
    }

    // Clean up saleDetails if listingType is Sale
    if (propertyData.listingType === 'Sale' && propertyData.saleDetails) {
        delete propertyData.saleDetails.depositAmount;
        delete propertyData.saleDetails.depositUnit;
        delete propertyData.saleDetails.maintenance;
        delete propertyData.saleDetails.veraBill;
    }

    const property = await Property.create(propertyData);
    
    // Consume addon unit if applicable
    if (req.subscriptionLimits?.property?.useAddon) {
        await vendorAddonService.consumeAddonUnit(vendorId, 'property');
    }

    // Flatten specifications for frontend compatibility
    const responseData = property.toObject();
    if (Array.isArray(responseData.specifications) && responseData.specifications.length > 0) {
        responseData.specifications = responseData.specifications[0];
    }

    // Ensure response doesn't contain these fields for Sale type
    if (responseData.listingType === 'Sale' && responseData.saleDetails) {
        delete responseData.saleDetails.depositAmount;
        delete responseData.saleDetails.depositUnit;
        delete responseData.saleDetails.maintenance;
        delete responseData.saleDetails.veraBill;
    }

    res.status(201).json({
        success: true,
        data: responseData,
    });
});

// @desc    Update property
// @route   PUT /api/property/update/:id
// @access  Vendor
export const updateProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    let property = await Property.findById(propertyId);

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Security: Check ownership
    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Check limits again if media is being updated
    if (req.body.media) {
        // Get maxImages from subscription middleware (set based on business type)
        // Developer: 50 images, Broker: 5 images
        const maxImages = req.subscriptionLimits?.property?.maxImages || 50;

        if (maxImages !== -1 && req.body.media.length > maxImages) {
            return res.status(400).json({
                success: false,
                message: `Image limit exceeded. Maximum ${maxImages} images allowed for your subscription.`
            });
        }

        // Process media uploads to Cloudinary
        const processedMedia = await processMediaUploads(req.body.media);
        req.body.media = processedMedia;
    }

    // Ensure ShopUnit linkage
    let shopUnitId = req.body.shopUnitId || property.shopUnitId;
    if (!shopUnitId) {
        const shopUnit = await ShopUnit.findOne({ vendorId }).select('_id').lean();
        if (shopUnit) shopUnitId = shopUnit._id;
    }

    const updateData = { ...req.body, shopUnitId };
    if (updateData.location) {
        updateData.location = {
            ...updateData.location,
            mapUrl: String(updateData?.location?.mapUrl || '').trim()
        };
    }
    if (updateData.flatDetails) {
        updateData.flatDetails = {
            ...DEFAULT_FLAT_DETAILS,
            ...updateData.flatDetails,
            amenities: {
                ...DEFAULT_FLAT_DETAILS.amenities,
                ...(updateData.flatDetails.amenities || {})
            },
            legal: {
                ...DEFAULT_FLAT_DETAILS.legal,
                ...(updateData.flatDetails.legal || {})
            }
        };
    }
    if (Array.isArray(req.body.flatVariants)) {
        const normalizedFlatVariants = req.body.flatVariants
            .map(sanitizeFlatVariant)
            .filter(v => String(v.flatType || '').trim() !== '');
        updateData.flatVariants = normalizedFlatVariants;
        if (normalizedFlatVariants.length > 0) {
            updateData.flatDetails = {
                ...(updateData.flatDetails || property.flatDetails || DEFAULT_FLAT_DETAILS),
                ...normalizedFlatVariants[0]
            };
        }
    }
    if (updateData.plotDetails) {
        updateData.plotDetails = {
            ...DEFAULT_PLOT_DETAILS,
            ...updateData.plotDetails,
            privateFacilities: {
                ...DEFAULT_PLOT_DETAILS.privateFacilities,
                ...(updateData.plotDetails.privateFacilities || {})
            },
            amenities: {
                ...DEFAULT_PLOT_DETAILS.amenities,
                ...(updateData.plotDetails.amenities || {})
            },
            legal: {
                ...DEFAULT_PLOT_DETAILS.legal,
                ...(updateData.plotDetails.legal || {})
            }
        };
    }
    updateData.facilities = {
        ...DEFAULT_FACILITIES,
        ...(property.facilities || {}),
        ...(updateData.facilities || {})
    };
    updateData.status = {
        ...DEFAULT_STATUS,
        ...(property.status || {}),
        ...(updateData.status || {})
    };
    updateData.legal = {
        ...DEFAULT_COMMERCIAL_LEGAL,
        ...(property.legal || {}),
        ...(updateData.legal || {})
    };

    // Compatibility: allow "Villa" updates even when runtime enum still has only "Plot".
    const enumValues = Property.schema.path('propertyType')?.enumValues || [];
    if (
        String(updateData.propertyType || '').toLowerCase() === 'villa' &&
        !enumValues.includes('Villa') &&
        enumValues.includes('Plot')
    ) {
        updateData.propertyType = 'Plot';
    }

    // Clean up saleDetails if listingType is Sale
    if (updateData.listingType === 'Sale' && updateData.saleDetails) {
        delete updateData.saleDetails.depositAmount;
        delete updateData.saleDetails.depositUnit;
        delete updateData.saleDetails.maintenance;
        delete updateData.saleDetails.veraBill;
    }

    property = await Property.findByIdAndUpdate(propertyId, updateData, {
        new: true,
        runValidators: true,
    }).lean();

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    // Ensure response doesn't contain these fields for Sale type
    if (property.listingType === 'Sale' && property.saleDetails) {
        delete property.saleDetails.depositAmount;
        delete property.saleDetails.depositUnit;
        delete property.saleDetails.maintenance;
        delete property.saleDetails.veraBill;
    }

    res.status(200).json({
        success: true,
        data: property,
    });
});

// @desc    Delete property
// @route   DELETE /api/property/delete/:id
// @access  Vendor
export const deleteProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId);

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Clean up Cloudinary images
    if (property.media && property.media.length > 0) {
        for (const mediaItem of property.media) {
            if (mediaItem.publicId) {
                try {
                    await deleteFromCloudinary(mediaItem.publicId);
                } catch (error) {
                    console.error('[Property Delete] Failed to delete image from Cloudinary:', error.message);
                    // Continue with deletion even if image cleanup fails
                }
            }
        }
    }

    await property.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Property removed successfully',
    });
});

// @desc    List vendor properties
// @route   GET /api/property/list
// @access  Vendor
export const listProperties = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const properties = await Property.find({ vendorId }).lean();

    // Flatten specifications for frontend compatibility and filter Sale details
    const formattedProperties = properties.map(prop => {
        const p = {
            ...prop,
            specifications: Array.isArray(prop.specifications) && prop.specifications.length > 0
                ? prop.specifications[0]
                : prop.specifications
        };

        // Filter Sale details as per user request
        if (p.listingType === 'Sale' && p.saleDetails) {
            delete p.saleDetails.depositAmount;
            delete p.saleDetails.depositUnit;
            delete p.saleDetails.maintenance;
            delete p.saleDetails.veraBill;
        }

        return p;
    });

    res.status(200).json({
        success: true,
        data: formattedProperties,
    });
});

// @desc    Get single property details
// @route   GET /api/property/details/:id
// @access  Vendor
export const getPropertyById = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId).lean();

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    // Filter Sale details as per user request
    if (property.listingType === 'Sale' && property.saleDetails) {
        delete property.saleDetails.depositAmount;
        delete property.saleDetails.depositUnit;
        delete property.saleDetails.maintenance;
    }

    res.status(200).json({
        success: true,
        data: property,
    });
});

// @desc    Get all properties (Public/Admin)
// @route   GET /api/public/property/all
// @access  Public
export const getAllProperties = asyncHandler(async (req, res) => {
    const { search, city, area, market, propertyType, flatType, floors, minPrice, maxPrice, minSize, maxSize, priceUnit, areaUnit, type, listingType, vendorId, strict, sortBy, sortOrder } = req.query;

    let query = { isActive: { $ne: false } }; // Show all active or uninitialized properties
    const queryConditions = [];

    if (vendorId) queryConditions.push({ vendorId });
    if (listingType && listingType !== 'All') queryConditions.push({ listingType });

    if (flatType && flatType !== 'All') {
        const normalizedFlatType = String(flatType).replace(/\s+/g, '').toUpperCase();
        const bhkMatch = normalizedFlatType.match(/^(\d+)BHK$/);
        const flatRegex = bhkMatch
            ? new RegExp(`^\\s*${bhkMatch[1]}\\s*BHK\\s*$`, 'i')
            : new RegExp(`^${String(flatType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        queryConditions.push({
            $or: [
                { 'flatDetails.flatType': { $regex: flatRegex } },
                { 'flatVariants.flatType': { $regex: flatRegex } }
            ]
        });
    }

    if (propertyType && propertyType !== 'All') {
        const normalizedType = String(propertyType).trim().toLowerCase();
        if (normalizedType === 'villa' || normalizedType === 'villa / row house' || normalizedType === 'villa/row house') {
            queryConditions.push({
                $or: [
                    { propertyType: { $regex: '^(Villa|Row House|Plot)$', $options: 'i' } },
                    { 'plotDetails.plotArea': { $gt: 0 } },
                    { 'plotDetails.builtUpArea': { $gt: 0 } }
                ]
            });
        } else if (normalizedType === 'flat') {
            queryConditions.push({
                $or: [
                    { propertyType: { $regex: '^Flat$', $options: 'i' } },
                    { 'flatDetails.flatType': { $exists: true, $ne: '' } }
                ]
            });
        } else if (normalizedType === 'commercial') {
            queryConditions.push({
                $or: [
                    { propertyType: { $in: ['Shop', 'Office', 'Showroom', 'Godown', 'Factory', 'Commercial Building'] } },
                    { propertyTypes: { $in: ['Shop', 'Office', 'Showroom', 'Godown', 'Factory', 'Commercial Building'] } }
                ]
            });
        } else {
            queryConditions.push({
                propertyType: { $regex: `^${String(propertyType).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
            });
        }
    }
    
    if (floors && floors !== 'All') {
        const escapedFloors = floors.replace(/[+]/g, '\\$&');
        queryConditions.push({ 'plotDetails.floors': { $regex: `^${escapedFloors}$`, $options: 'i' } });
    }



    // Broaden vendor matching - check all active B2B vendors
    const activeVendors = await Vendor.find({ 
        isActive: true,
        vendorType: 'b2b'
    }).select('_id').lean();
    const activeVendorIds = activeVendors.map(v => v._id);
    queryConditions.push({ vendorId: { $in: activeVendorIds } });

    // Handle Location Filters (City, Area, Market) - Match property location OR vendor location
    if (city && city !== 'All Cities') {
        const matchingVendors = await Vendor.find({
            'address.city': { $regex: city, $options: 'i' },
            businessType: { $in: [/developer/i, /broker/i] }
        }).select('_id').lean();
        const vIds = matchingVendors.map(v => v._id);

        queryConditions.push({
            $or: [
                { 'location.city': { $regex: city, $options: 'i' } },
                { vendorId: { $in: vIds } }
            ]
        });
    }

    if (area && area !== 'All Areas') {
        const matchingVendors = await Vendor.find({
            'address.area': { $regex: area, $options: 'i' },
            businessType: { $in: [/developer/i, /broker/i] }
        }).select('_id').lean();
        const vIds = matchingVendors.map(v => v._id);

        queryConditions.push({
            $or: [
                { 'location.area': { $regex: area, $options: 'i' } },
                { vendorId: { $in: vIds } }
            ]
        });
    }

    if (market && market !== 'All Markets') {
        const matchingVendors = await Vendor.find({
            'address.market': { $regex: market, $options: 'i' },
            businessType: { $in: [/developer/i, /broker/i] }
        }).select('_id').lean();
        const vIds = matchingVendors.map(v => v._id);

        queryConditions.push({
            $or: [
                { 'location.market': { $regex: market, $options: 'i' } },
                { vendorId: { $in: vIds } }
            ]
        });
    }

    // Handle Search
    if (search) {
        const isStrict = strict === 'true' || strict === true;
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexValue = isStrict ? new RegExp('^' + escapedSearch, 'i') : new RegExp(escapedSearch, 'i');

        // Find matching vendors first to include their properties
        const matchingVendors = await Vendor.find({
            storeName: { $regex: regexValue },
            businessType: { $in: [/developer/i, /broker/i] }
        }).select('_id').lean();
        const matchingVendorIds = matchingVendors.map(v => v._id);

        queryConditions.push({
            $or: [
                { title: { $regex: regexValue } },
                { 'location.area': { $regex: search, $options: 'i' } }, // Keep area search broad even in strict? Or make it strict too?
                { propertyType: { $regex: regexValue } },
                { description: { $regex: regexValue } },
                { vendorId: { $in: matchingVendorIds } }
            ]
        });
    }

    if (queryConditions.length > 0) {
        query.$and = queryConditions;
    }

    // Filter by Vendor Type
    let vendorMatch = {};
    if (type === 'developer') {
        vendorMatch.businessType = { $regex: '^developer', $options: 'i' };
    } else if (type === 'broker') {
        vendorMatch.businessType = { $regex: '^broker', $options: 'i' };
    }

    let properties = await Property.find(query)
        .populate({
            path: 'vendorId',
            select: 'storeName address businessType phone storeLogo status'
        })
        .populate('shopUnitId')
        .sort({ createdAt: -1 }) // Sort at DB level
        .lean();

    // Filter out properties where vendor didn't match the type or is missing
    let filteredResults = properties.filter(p => {
        if (!p.vendorId) return false;
        
        // If a specific vendor type was requested (developer/broker), filter for it
        if (Object.keys(vendorMatch).length > 0) {
            const bType = String(p.vendorId.businessType || '').toLowerCase();
            if (type === 'developer' && !bType.includes('developer')) return false;
            if (type === 'broker' && !bType.includes('broker')) return false;
        }
        
        return true;
    });

    // Helpers for normalization
    const getPriceInLakhs = (amount, unit) => {
        const val = parseFloat(amount) || 0;
        const normalizedUnit = (unit || 'Lakh').trim();
        switch (normalizedUnit) {
            case 'Rs': return val / 100000;
            case 'Thousand': return val / 100;
            case 'Lakh': return val;
            case 'Crore': return val * 100;
            default: return val;
        }
    };

    const getAreaInSqFt = (area, unit) => {
        const val = parseFloat(String(area).replace(/[^0-9.]/g, '')) || 0;
        const normalizedUnit = (unit || 'Sq. Ft.').trim();
        switch (normalizedUnit) {
            case 'Sq. Ft.': return val;
            case 'Sq. Mt.': return val * 10.7639;
            case 'Sq. Yd.': return val * 9;
            case 'Acre': return val * 43560;
            case 'Gaj': return val * 9;
            default: return val;
        }
    };

    const hasPriceFilterValues = (minPrice && String(minPrice).trim() !== '') || (maxPrice && String(maxPrice).trim() !== '');
    const hasSizeFilterValues = (minSize && String(minSize).trim() !== '') || (maxSize && String(maxSize).trim() !== '');

    // When user selects ONLY a unit (no min/max): filter by property's stored unit - different results per unit
    // When user enters min/max: use range filter (all properties, convert to common unit) - new listings show if they match
    const validPriceUnits = ['Rs', 'Thousand', 'Lakh', 'Crore'];
    const validAreaUnits = ['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'];
    const priceUnitSelected = priceUnit && validPriceUnits.some(u => u.toLowerCase() === (priceUnit || '').trim().toLowerCase());
    const areaUnitSelected = areaUnit && validAreaUnits.some(u => u.toLowerCase() === (areaUnit || '').trim().toLowerCase());

    if (!hasPriceFilterValues && priceUnitSelected) {
        const targetUnit = (priceUnit || '').trim();
        filteredResults = filteredResults.filter(p => {
            let propUnit = null;
            if (p.listingType === 'Sale' && p.saleDetails?.priceUnit) {
                propUnit = (p.saleDetails.priceUnit || '').trim();
            } else if (p.listingType === 'Rent' && p.rentDetails?.rentUnit) {
                propUnit = (p.rentDetails.rentUnit || 'Thousand').trim();
            } else if (p.listingType === 'Lease' && p.leaseDetails?.leaseUnit) {
                propUnit = (p.leaseDetails.leaseUnit || 'Lakh').trim();
            }
            return propUnit && propUnit.toLowerCase() === targetUnit.toLowerCase();
        });
    }

    if (!hasSizeFilterValues && areaUnitSelected) {
        const targetAreaUnit = (areaUnit || '').trim();
        filteredResults = filteredResults.filter(p => {
            const specs = Array.isArray(p.specifications) && p.specifications.length > 0
                ? p.specifications[0]
                : (p.specifications || {});
            const propUnit = (specs.builtUpAreaUnit || specs.carpetAreaUnit || 'Sq. Ft.').trim();
            return propUnit && propUnit.toLowerCase() === targetAreaUnit.toLowerCase();
        });
    }

    // When min/max provided: range filter (unit interprets user input; all properties compared in common unit)
    const hasPriceFilter = hasPriceFilterValues;
    const hasSizeFilter = hasSizeFilterValues;

    if (hasPriceFilter || hasSizeFilter) {
        // Price Filter Range (Local Scale to Lakhs)
        const filterPUnit = (priceUnit && priceUnit !== 'All') ? priceUnit : 'Lakh';
        const fMinP = minPrice ? parseFloat(minPrice) : 0;
        const fMaxP = maxPrice ? parseFloat(maxPrice) : Infinity;
        const normFilterMinP = getPriceInLakhs(fMinP, filterPUnit);
        const normFilterMaxP = getPriceInLakhs(fMaxP, filterPUnit);

        // Size Filter Range (Local Scale to Sq. Ft.)
        const filterAUnit = areaUnit || 'Sq. Ft.';
        const fMinS = minSize ? parseFloat(minSize) : 0;
        const fMaxS = maxSize ? parseFloat(maxSize) : Infinity;
        const normFilterMinS = getAreaInSqFt(fMinS, filterAUnit);
        const normFilterMaxS = getAreaInSqFt(fMaxS, filterAUnit);

        filteredResults = filteredResults.filter(p => {
            // 1. Price check
            if (hasPriceFilter) {
                let pMinInLakhs = 0;
                let pMaxInLakhs = 0;

                if (p.listingType === 'Sale' && p.saleDetails) {
                    pMinInLakhs = getPriceInLakhs(p.saleDetails.priceMin, p.saleDetails.priceUnit);
                    pMaxInLakhs = getPriceInLakhs(p.saleDetails.priceMax || p.saleDetails.priceMin, p.saleDetails.priceUnit);
                } else if (p.listingType === 'Rent' && p.rentDetails) {
                    pMinInLakhs = getPriceInLakhs(p.rentDetails.monthlyRent, p.rentDetails.rentUnit || 'Thousand');
                    pMaxInLakhs = pMinInLakhs;
                } else if (p.listingType === 'Lease' && p.leaseDetails) {
                    pMinInLakhs = getPriceInLakhs(p.leaseDetails.monthlyLeaseRate, p.leaseDetails.leaseUnit);
                    pMaxInLakhs = pMinInLakhs;
                } else {
                    pMinInLakhs = (p.price?.amount || 0) / 100000;
                    pMaxInLakhs = pMinInLakhs;
                }

                const matchesPrice = (pMinInLakhs <= normFilterMaxP && pMaxInLakhs >= normFilterMinP);
                if (!matchesPrice) return false;
            }

            // 2. Size check
            if (hasSizeFilter) {
                const specs = Array.isArray(p.specifications) && p.specifications.length > 0
                    ? p.specifications[0]
                    : (p.specifications || {});

                const areaVal = specs.builtUpArea || p.totalArea || 0;
                const propAreaInSqFt = getAreaInSqFt(areaVal, specs.builtUpAreaUnit);

                const matchesSize = (propAreaInSqFt >= normFilterMinS && propAreaInSqFt <= normFilterMaxS);
                if (!matchesSize) return false;
            }

            return true;
        });
    }

    // Fetch all shop units for these vendors to provide a fallback if shopUnitId is null
    const vendorIds = [...new Set(filteredResults.map(p => p.vendorId._id.toString()))];
    const shopUnits = await ShopUnit.find({ vendorId: { $in: vendorIds } }).lean();
    const shopUnitMap = shopUnits.reduce((acc, unit) => {
        acc[unit.vendorId.toString()] = unit;
        return acc;
    }, {});

    // Flatten specifications for frontend compatibility
    let finalProperties = filteredResults.map(prop => {
        const shop = prop.shopUnitId || shopUnitMap[prop.vendorId._id.toString()];

        // Calculate normalized price for sorting
        let effectivePriceInLakhs = 0;
        if (prop.listingType === 'Sale' && prop.saleDetails) {
            effectivePriceInLakhs = getPriceInLakhs(prop.saleDetails.priceMin, prop.saleDetails.priceUnit);
        } else if (prop.listingType === 'Rent' && prop.rentDetails) {
            effectivePriceInLakhs = getPriceInLakhs(prop.rentDetails.monthlyRent, prop.rentDetails.rentUnit || 'Thousand');
        } else if (prop.listingType === 'Lease' && prop.leaseDetails) {
            effectivePriceInLakhs = getPriceInLakhs(prop.leaseDetails.monthlyLeaseRate, prop.leaseDetails.leaseUnit);
        }

        const p = {
            ...prop,
            effectivePriceInLakhs,
            // If shop exists, use its name as the primary title/name for display consistency
            shopName: shop ? shop.name : prop.vendorId?.storeName,
            shopUnit: shop,
            specifications: Array.isArray(prop.specifications) && prop.specifications.length > 0
                ? prop.specifications[0]
                : prop.specifications
        };

        // Filter Sale details as per user request
        if (p.listingType === 'Sale' && p.saleDetails) {
            delete p.saleDetails.depositAmount;
            delete p.saleDetails.depositUnit;
            delete p.saleDetails.maintenance;
        }

        return p;
    });

    // Handle Sorting
    if (sortBy === 'price') {
        const dir = sortOrder === 'asc' ? 1 : -1;
        finalProperties.sort((a, b) => (a.effectivePriceInLakhs - b.effectivePriceInLakhs) * dir);
    } else if (sortBy === 'createdAt') {
        const dir = sortOrder === 'asc' ? 1 : -1;
        finalProperties.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir);
    } else if (sortBy === 'title') {
        const dir = sortOrder === 'asc' ? 1 : -1;
        finalProperties.sort((a, b) => a.title.localeCompare(b.title) * dir);
    }

    // Find matching vendors for the "Matching Stores" section in UI
    let matchingVendors = [];
    if (search) {
        const rawVendors = await Vendor.find({
            storeName: { $regex: search, $options: 'i' },
            businessType: { $in: [/developer/i, /broker/i] },
            status: 'approved',
            isActive: true
        }).select('storeName address businessType storeLogo phone storeDescription email').lean();

        // Enhance vendors with property counts and shop unit data
        matchingVendors = await Promise.all(rawVendors.map(async (v) => {
            const [propertyCount, shopUnit] = await Promise.all([
                Property.countDocuments({ vendorId: v._id, isActive: true }),
                ShopUnit.findOne({ vendorId: v._id }).lean()
            ]);
            return {
                ...v,
                totalProducts: propertyCount, // Use totalProducts for frontend compatibility
                totalProperties: propertyCount,
                shopUnit: shopUnit || null
            };
        }));
    }

    // Enrich with vendor enquiry status
    if (finalProperties.length > 0) {
        const vendorIds = [...new Set(finalProperties.map(p => p.vendorId?._id?.toString()).filter(Boolean))];
        const enquiryStatuses = await Promise.all(
            vendorIds.map(id => subscriptionRulesService.getVendorEnquiryStatus(id))
        );
        const statusMap = new Map(vendorIds.map((id, index) => [id, enquiryStatuses[index]]));
        
        finalProperties = finalProperties.map(p => ({
            ...p,
            enquiryStatus: statusMap.get(p.vendorId?._id?.toString()) || { canAcceptEnquiries: false, reason: 'UNKNOWN' }
        }));
    }

    res.status(200).json({
        success: true,
        count: finalProperties.length,
        data: finalProperties,
        matchingVendors: matchingVendors
    });
});

// @desc    Get single property details (Public)
// @route   GET /api/property/public/details/:id
// @access  Public
export const getPublicPropertyById = asyncHandler(async (req, res) => {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId)
        .populate('vendorId', 'storeName address businessType phone storeLogo storeDescription')
        .populate('shopUnitId')
        .lean();

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    // Filter Sale details as per user request
    if (property.listingType === 'Sale' && property.saleDetails) {
        delete property.saleDetails.depositAmount;
        delete property.saleDetails.depositUnit;
        delete property.saleDetails.maintenance;
    }

    let shop = property.shopUnitId;
    if (!shop && property.vendorId?._id) {
        shop = await ShopUnit.findOne({ vendorId: property.vendorId._id }).lean();
    }

    if (shop) {
        property.shopName = shop.name;
        property.shopUnit = shop;
    } else {
        property.shopName = property.vendorId?.storeName;
    }

    const enquiryStatus = await subscriptionRulesService.getVendorEnquiryStatus(property.vendorId?._id || property.vendorId);

    res.status(200).json({
        success: true,
        data: {
            property,
            enquiryStatus
        },
    });
});

/**
 * Get Real Estate search suggestions
 * GET /api/property/suggestions
 */
export const getPropertySuggestions = asyncHandler(async (req, res) => {
    const { q = '' } = req.query;
    if (!q || q.trim().length < 1) {
        return res.status(200).json({ success: true, data: [] });
    }

    const query = q.trim();
    const categories = {
        stores: [],
        properties: []
    };

    const realEstateTypes = [/developer/i, /broker/i];

    const [properties, vendors] = await Promise.all([
        Property.find({
            title: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('title media vendorId'),
        Vendor.find({
            storeName: { $regex: query, $options: 'i' },
            status: 'approved',
            isActive: true,
            businessType: { $in: realEstateTypes }
        }).limit(5).select('storeName storeLogo address businessType')
    ]);

    // Property Suggestions
    properties.forEach(p => {
        categories.properties.push({
            text: p.title,
            context: 'In Properties',
            type: 'property',
            image: (p.media && p.media[0]?.url) || null,
            id: p._id
        });
    });

    // Vendor Suggestions (Developer/Broker)
    vendors.forEach(v => {
        categories.stores.push({
            text: v.storeName,
            context: v.address?.city ? `Store · ${v.address.city}` : 'Store',
            type: 'store',
            vendorId: v._id,
            image: v.storeLogo || null
        });
    });

    res.status(200).json({
        success: true,
        data: categories
    });
});
