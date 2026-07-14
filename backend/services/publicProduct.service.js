import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import ShopUnit from '../models/ShopUnit.model.js';
import { normalizeState, normalizeCity } from '../utils/addressNormalizer.util.js';
import { getRatingSummaries, getRatingSummary } from './rating.service.js';

/**
 * Get public products with filtering and pagination
 */
export const getPublicProducts = async (filters) => {
    const {
        search, description, // description added to destructuring just in case
        categoryId,
        subcategoryId,
        brandId,
        minPrice,
        maxPrice,
        vendorId,
        vendorType,
        state,
        city,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        itemType,
        area,
        market,
        businessType,
        businessCategory,
        excludeBusinessTypes, // Added excludeBusinessTypes to destructuring
        dynamicFilters,
        strict
    } = filters;

    // --- Helper to build match query ---
    const buildMatchQuery = async (isLotSlot = false) => {
        const query = { isActive: true, isVisible: { $ne: false } };

        // Search Filter
        if (search) {
            const isStrict = filters.strict === 'true' || filters.strict === true;
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            if (isStrict) {
                // Strict mode: Only match products that start with the search query
                const regexValue = "^" + escapedSearch;
                const regex = { $regex: regexValue, $options: 'i' };

                const orConditions = [{ name: regex }];
                query.$or = orConditions;
            } else {
                // Broad mode: Substring match in multiple fields
                const regex = { $regex: escapedSearch, $options: 'i' };
                const nameRegex = { $regex: escapedSearch, $options: 'i' };

                const orConditions = [
                    { name: nameRegex }, // Names can contain query anywhere
                    { description: regex }, // Descriptions broad match
                    { category: regex },
                    { subcategory: regex }
                ];
                query.$or = orConditions;
            }
        }

        // Category
        if (categoryId) {
            try {
                // Try to resolve category ID to name, or use as string
                const cat = await B2BCategory.findById(categoryId);
                const catName = cat ? cat.name : categoryId;
                
                // Allow flexible whitespace around slashes in category name regex
                const flexibleName = String(catName).trim()
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\//g, '\\s*/\\s*');
                
                query.category = { $regex: new RegExp(`^\\s*${flexibleName}\\s*$`, 'i') };
            } catch (e) {
                const flexibleId = String(categoryId).trim()
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\//g, '\\s*/\\s*');
                query.category = { $regex: new RegExp(`^\\s*${flexibleId}\\s*$`, 'i') };
            }
        }

        // Subcategory
        if (subcategoryId) {
            const flexibleSub = String(subcategoryId).trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\//g, '\\s*/\\s*');
            query.subcategory = { $regex: new RegExp(`^\\s*${flexibleSub}\\s*$`, 'i') };
        }

        // Brand
        if (brandId) {
            if (isLotSlot) query.brand = brandId; // LotSlot uses 'brand'
            else query.brandName = brandId; // Product uses 'brandName'
        }

        // Price
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Dynamic Filters (Attributes)
        if (dynamicFilters) {
            try {
                const parsedFilters = typeof dynamicFilters === 'string' ? JSON.parse(dynamicFilters) : dynamicFilters;
                const filterEntries = Object.entries(parsedFilters);

                if (filterEntries.length > 0) {
                    const dynamicQueryParts = filterEntries.map(([attrName, value]) => {
                        const matchQuery = { name: attrName };
                        if (Array.isArray(value)) {
                            matchQuery.value = { $in: value };
                        } else {
                            matchQuery.value = value;
                        }
                        // LotSlots uses specifications array, Product uses attributes array
                        // Both have similar structure { name, value } but different field names in schema?
                        // Product: attributes[{ attributeName, name, value }]
                        // LotSlot: specifications[{ name, value }]
                        const fieldName = isLotSlot ? 'specifications' : 'attributes';
                        return { [fieldName]: { $elemMatch: matchQuery } };
                    });

                    if (query.$and) {
                        query.$and.push(...dynamicQueryParts);
                    } else {
                        query.$and = dynamicQueryParts;
                    }
                }
            } catch (e) {
                console.error('Error parsing dynamicFilters:', e);
            }
        }

        return query;
    };

    // --- Resolve Vendor IDs from Business Category (ShopUnit) ---
    let businessCategoryVendorIds = null;
    if (businessCategory && String(businessCategory).trim()) {
        const shopUnits = await ShopUnit.find({
            businessCategory: { $regex: new RegExp(`^${String(businessCategory).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).select('vendorId').lean();
        businessCategoryVendorIds = shopUnits.map(s => s.vendorId).filter(Boolean);
    }

    // --- Resolve Vendor IDs from Location Filters ---
    let locationVendorIds = null;
    if (state || city || area || market || businessType || excludeBusinessTypes) {
        const vendorQuery = { isActive: true };

        const normalizedState = state ? normalizeState(state) : null;
        const normalizedCity = city ? normalizeCity(city) : null;

        if (normalizedState) {
            const escapedState = String(normalizedState).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            vendorQuery['address.state'] = { $regex: new RegExp(`^\\s*${escapedState}\\s*$`, 'i') };
        }
        if (normalizedCity) {
            const escapedCity = String(normalizedCity).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Special robust match for Agra/Aagra
            if (escapedCity.toLowerCase() === 'agra') {
                vendorQuery['address.city'] = { $regex: /^\s*(agra|aagra)\s*$/i };
            } else {
                vendorQuery['address.city'] = { $regex: new RegExp(`^\\s*${escapedCity}\\s*$`, 'i') };
            }
        }
        if (area) vendorQuery['address.area'] = { $regex: new RegExp(`^${String(area).trim()}$`, 'i') };
        if (market) {
            const marketValue = String(market).trim();
            const escapedMarket = marketValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            vendorQuery['address.market'] = { $regex: new RegExp(`^${escapedMarket}$`, 'i') };
        }
        if (businessType) {
            vendorQuery.businessType = { $regex: new RegExp(`^${String(businessType).trim()}$`, 'i') };
        } else if (excludeBusinessTypes) {
            const excludeArr = Array.isArray(excludeBusinessTypes) ? excludeBusinessTypes : String(excludeBusinessTypes).split(',').map(t => t.trim());
            if (excludeArr.length > 0) {
                vendorQuery.businessType = { $nin: excludeArr.map(t => new RegExp(`^${t}$`, 'i')) };
            }
        }


        const matchingVendors = await Vendor.find(vendorQuery).select('_id').lean();
        locationVendorIds = matchingVendors.map(v => v._id);

        // If market filter is applied but no vendors found, return empty results
        if (market && locationVendorIds.length === 0) {
            locationVendorIds = []; // Empty array will result in no products
        }
    }

    // --- Combine Vendor Filter ---
    const applyVendorFilter = (query) => {
        // Intersect with businessCategoryVendorIds if set
        let effectiveVendorIds = locationVendorIds;
        if (businessCategoryVendorIds) {
            if (effectiveVendorIds) {
                const locSet = new Set(effectiveVendorIds.map(id => id.toString()));
                effectiveVendorIds = businessCategoryVendorIds.filter(id => locSet.has(id.toString()));
            } else {
                effectiveVendorIds = businessCategoryVendorIds;
            }
        }

        if (vendorId) {
            if (effectiveVendorIds) {
                // Intersection
                if (effectiveVendorIds.some(id => id.toString() === vendorId.toString())) {
                    query.vendorId = new mongoose.Types.ObjectId(vendorId);
                } else {
                    // Intersection empty -> no results
                    query.vendorId = new mongoose.Types.ObjectId('000000000000000000000000'); // Valid but non-existent ObjectId
                }
            } else {
                query.vendorId = new mongoose.Types.ObjectId(vendorId);
            }
        } else if (effectiveVendorIds) {
            query.vendorId = { $in: effectiveVendorIds };
        }
        return query;
    };

    // --- Build Queries ---
    let productQuery = await buildMatchQuery(false);
    // Exclude legacy item listings
    productQuery.formType = { $ne: 'shop-listing' };
    productQuery = applyVendorFilter(productQuery);

    let lotSlotQuery = await buildMatchQuery(true);
    lotSlotQuery = applyVendorFilter(lotSlotQuery);

    // --- Aggregation Pipeline ---
    const pipeline = [];

    // 1. Tag and Match
    // If itemType is specific, we only query that collection
    // If 'all', we union

    const effectiveItemType = itemType || 'product';

    if (effectiveItemType === 'product' || effectiveItemType === 'all') {
        pipeline.push({ $match: productQuery });
        pipeline.push({ $addFields: { itemType: 'product' } });
    } else {
        // If sorting strictly by 'lotslot', start empty
        pipeline.push({ $match: { _id: null } }); // Match nothing in Product
    }

    // 2. Union with LotSlot
    if (effectiveItemType === 'lotslot' || effectiveItemType === 'all') {
        pipeline.push({
            $unionWith: {
                coll: 'lotslots',
                pipeline: [
                    { $match: lotSlotQuery },
                    { $addFields: { itemType: 'lotslot', brandName: '$brand' } } // Map brand -> brandName
                ]
            }
        });
    }

    // 3. Sort - Prioritize relevance if search is present
    const sortField = sortBy === 'price' ? 'effectivePrice' : (sortBy === 'createdAt' ? 'createdAt' : sortBy);
    const sortOrderRaw = sortOrder || 'desc';
    const sortDir = sortOrderRaw === 'desc' ? -1 : 1;

    // Add effectivePrice field for consistent price sorting across regular products and shop listings
    pipeline.push({
        $addFields: {
            effectivePrice: {
                $cond: [
                    { $ifNull: ["$price", false] },
                    "$price",
                    { $ifNull: ["$minPrice", 0] }
                ]
            }
        }
    });

    if (search) {
        // Escaping literal for regex
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        pipeline.push({
            $addFields: {
                relevance: {
                    $cond: [
                        { $eq: [{ $toLower: "$name" }, search.toLowerCase()] },
                        100, // Exact match
                        {
                            $cond: [
                                { $regexMatch: { input: "$name", regex: "^" + escapedSearch, options: "i" } },
                                50, // Name starts with
                                {
                                    $cond: [
                                        { $regexMatch: { input: "$name", regex: "\\b" + escapedSearch + "\\b", options: "i" } },
                                        20,
                                        1
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        });
        pipeline.push({ $sort: { relevance: -1, [sortField]: sortDir } });

        if (strict === 'true' || strict === true) {
            pipeline.push({ $match: { relevance: { $gte: 50 } } });
        }
    } else {
        pipeline.push({ $sort: { [sortField]: sortDir } });
    }

    // 4. Facet for Total Count & Paginated Data
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) },
                {
                    $addFields: {
                        vendorIdRef: '$vendorId',
                        shopIdRef: '$shopUnitId'
                    }
                },
                // Populate Vendor
                {
                    $lookup: {
                        from: 'vendors',
                        localField: 'vendorId',
                        foreignField: '_id',
                        pipeline: [{ $project: { _id: 1, name: 1, storeName: 1, address: 1, phone: 1, logo: 1, mfgOfWork: 1 } }],
                        as: 'vendorId'
                    }
                },
                { $unwind: { path: '$vendorId', preserveNullAndEmptyArrays: true } },
                // Populate ShopUnit by product's shopUnitId (for shop-listing)
                {
                    $lookup: {
                        from: 'shopunits',
                        localField: 'shopIdRef',
                        foreignField: '_id',
                        as: 'shopUnit'
                    }
                },
                { $unwind: { path: '$shopUnit', preserveNullAndEmptyArrays: true } },
                // Fallback: ShopUnit by vendorId (one per vendor) so shop name always available
                {
                    $lookup: {
                        from: 'shopunits',
                        localField: 'vendorIdRef',
                        foreignField: 'vendorId',
                        as: 'vendorShopUnit'
                    }
                },
                { $unwind: { path: '$vendorShopUnit', preserveNullAndEmptyArrays: true } }
            ]
        }
    });

    // Execute
    const result = await Product.aggregate(pipeline);

    const metadata = result[0].metadata;
    let data = result[0].data;

    const total = metadata.length > 0 ? metadata[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Merge ShopUnit data: shop name = listing name (from shop add form), not registration company name
    data = data.map(p => {
        const shop = p.shopUnit || p.vendorShopUnit;

        if (shop) {
            p.shopName = shop.name;
            p.shopUnit = p.shopUnit || shop;
        }

        // Do not transform product data based on legacy item listings

        return p;
    });

    // Attach rating summary (averageRating, ratingCount) per item
    if (data.length > 0) {
        const productIds = data.filter(d => d.itemType === 'product').map(d => d._id);
        const lotSlotIds = data.filter(d => d.itemType === 'lotslot').map(d => d._id);
        const [productRatings, lotSlotRatings] = await Promise.all([
            productIds.length ? getRatingSummaries('product', productIds) : {},
            lotSlotIds.length ? getRatingSummaries('lotslot', lotSlotIds) : {},
        ]);
        data = data.map(p => {
            const idStr = p._id.toString();
            const summary = p.itemType === 'lotslot' ? lotSlotRatings[idStr] : productRatings[idStr];
            return {
                ...p,
                averageRating: summary?.averageRating ?? 0,
                ratingCount: summary?.ratingCount ?? 0,
            };
        });
    }

    return {
        products: data,
        total,
        page: parseInt(page),
        pages: totalPages
    };
};

/**
 * Get single product by ID
 */
export const getPublicProductById = async (id) => {
    let item = await Product.findOne({ _id: id, isActive: true })
        .populate('vendorId', 'name storeName description logo phone address mfgOfWork')
        .lean();

    let isLotSlot = false;
    if (!item) {
        item = await LotSlot.findOne({ _id: id, isActive: true })
            .populate('vendorId', 'name storeName description logo phone address mfgOfWork')
            .populate('shopUnitId')
            .lean();
        isLotSlot = true;
    }

    if (!item) throw new Error('Product not found');

    // Tag it - with .lean(), item is already a plain object
    let taggedItem = { ...item, itemType: isLotSlot ? 'lotslot' : 'product' };

    // Merge ShopUnit data for shop listings or items (shop name = listing name, not registration)
    let shop = taggedItem.shopUnitId;
    if (!shop && taggedItem.vendorId?._id) {
        shop = await ShopUnit.findOne({ vendorId: taggedItem.vendorId._id }).lean();
    }

    if (shop) {
        if (!isLotSlot && taggedItem.formType === 'shop-listing') {
            taggedItem.name = taggedItem.name || shop.name;
            taggedItem.description = taggedItem.description || shop.description;
            taggedItem.image = taggedItem.image || (shop.images && shop.images[0]);
            taggedItem.images = (taggedItem.images && taggedItem.images.length > 0) ? taggedItem.images : shop.images;
            taggedItem.minPrice = taggedItem.minPrice ?? shop.minPrice;
            taggedItem.maxPrice = taggedItem.maxPrice ?? shop.maxPrice;
            if (taggedItem.price === undefined || taggedItem.price === 0) taggedItem.price = shop.minPrice;
        }
        taggedItem.shopName = shop.name;
        taggedItem.shopUnit = shop;
    } else {
        taggedItem.shopName = taggedItem.vendorId?.storeName || taggedItem.vendorId?.name;
    }

    const ratingSummary = await getRatingSummary(
        isLotSlot ? 'lotslot' : 'product',
        taggedItem._id.toString()
    );
    taggedItem.averageRating = ratingSummary.averageRating;
    taggedItem.ratingCount = ratingSummary.ratingCount;

    return taggedItem;
};

/**
 * Get search suggestions
 */
export const getB2BSearchSuggestions = async (query, vendorFilterId) => {
    if (!query || query.trim().length < 1) return [];

    const suggestions = [];

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escapedQuery, $options: 'i' };

    // Fetch from all integrated collections with higher limits to ensure varied matching
    const [products, lotSlots, vendors, shopUnits, properties, b2bCategories] = await Promise.all([
        Product.find({
            name: searchRegex,
            isActive: true
        }).limit(100).select('name image vendorId formType'),
        LotSlot.find({
            name: searchRegex,
            isActive: true
        }).limit(100).select('name image vendorId'),
        Vendor.find({
            storeName: searchRegex,
            status: 'approved',
            isActive: true
        }).limit(30).select('storeName storeLogo address businessType'),
        ShopUnit.find({ name: searchRegex })
            .limit(20)
            .populate({
                path: 'vendorId',
                match: {
                    status: 'approved',
                    isActive: true
                },
                select: 'storeName storeLogo address status isActive businessType'
            })
            .lean(),
        mongoose.model('Property').find({
            title: searchRegex,
            isActive: true
        }).limit(20).select('title media images location vendorId listingType').lean(),
        B2BCategory.find({
            $or: [
                { name: searchRegex },
                { 'subcategories.name': searchRegex }
            ],
            isActive: { $ne: false }
        }).limit(10).lean()
    ]);

    // Categories & Subcategories first (High Context)
    b2bCategories.forEach(cat => {
        // Direct category match
        if (cat.name?.toLowerCase().includes(query.toLowerCase())) {
            const isDup = suggestions.some(s => s.text?.toLowerCase() === cat.name?.toLowerCase() && s.type === 'category');
            if (!isDup) {
                suggestions.push({
                    text: cat.name,
                    context: 'In Categories',
                    type: 'category',
                    image: null
                });
            }
        }
        // Subcategory matches
        (cat.subcategories || []).forEach(sub => {
            if (sub.name?.toLowerCase().includes(query.toLowerCase())) {
                const isDup = suggestions.some(s => s.text?.toLowerCase() === sub.name?.toLowerCase());
                if (!isDup) {
                    suggestions.push({
                        text: sub.name,
                        context: `In ${cat.name}`,
                        type: 'subcategory',
                        categoryId: cat._id.toString(),
                        image: null
                    });
                }
            }
        });
    });

    // Products - dedup by name (case-insensitive)
    products.forEach(p => {
        const isDup = suggestions.some(s =>
            s.text?.toLowerCase() === p.name?.toLowerCase()
        );
        if (!isDup) {
            suggestions.push({
                text: p.name,
                context: 'In Products',
                type: 'product',
                image: p.image || null,
                vendorId: p.vendorId?.toString(),
                formType: p.formType
            });
        }
    });

    // LotSlots - dedup by name (case-insensitive)
    lotSlots.forEach(l => {
        const isDup = suggestions.some(s =>
            s.text?.toLowerCase() === l.name?.toLowerCase() && s.type === 'lotslot'
        );
        if (!isDup) {
            suggestions.push({
                text: l.name,
                context: 'In Lots/Slots',
                type: 'lotslot',
                image: l.image || (l.images && l.images[0]) || null,
                vendorId: l.vendorId?.toString()
            });
        }
    });

    // Property results
    properties.forEach(p => {
        const imageUrl = p.media?.[0]?.url || p.images?.[0] || null;
        suggestions.push({
            id: p._id.toString(),
            text: p.title,
            context: `${p.listingType || 'Property'} · ${p.location?.city || ''}`,
            type: 'property',
            image: imageUrl,
            vendorId: p.vendorId?.toString()
        });
    });

    // Removed item suggestions from legacy item listings

    // Store suggestions from direct vendor names (Deduplicated by Store Name)
    vendors.forEach(v => {
        const storeName = v.storeName;
        if (!storeName) return;
        const storeNameLower = storeName.toLowerCase();

        // Check for name duplicates with products/lotslots
        const dupIdx = suggestions.findIndex(s =>
            s.text?.toLowerCase() === storeNameLower && s.type !== 'store'
        );
        if (dupIdx !== -1) suggestions.splice(dupIdx, 1);

        // Deduplicate by name for stores - user requested only one name if multiple shops have same name
        if (suggestions.some(s => s.type === 'store' && s.text?.toLowerCase() === storeNameLower)) {
            return;
        }

        const isRealEstate = v.businessType?.match(/developer|broker/i);
        suggestions.push({
            type: 'store',
            text: storeName,
            // User requested location to NOT be shown in suggestions context
            context: isRealEstate ? `${v.businessType} Office` : 'Store',
            vendorId: v._id.toString(),
            image: v.storeLogo || null,
            isRealEstate: !!isRealEstate,
            businessType: v.businessType
        });
    });

    // Store suggestions from ShopUnit names (Deduplicated)
    shopUnits.forEach(unit => {
        const vendor = unit.vendorId;
        if (!vendor || vendor.status !== 'approved' || vendor.isActive === false) return;

        const shopName = unit.name;
        if (!shopName) return;
        const shopNameLower = shopName.toLowerCase();

        // Deduplicate by name for shops
        if (suggestions.some(s => s.type === 'store' && s.text?.toLowerCase() === shopNameLower)) {
            return;
        }

        // Check for name duplicates with products
        const dupIdx = suggestions.findIndex(s =>
            s.text?.toLowerCase() === shopNameLower && s.type !== 'store'
        );
        if (dupIdx !== -1) suggestions.splice(dupIdx, 1);

        const isRealEstate = vendor.businessType?.match(/developer|broker/i);
        suggestions.push({
            type: 'store',
            text: shopName,
            context: isRealEstate ? `${vendor.businessType} Office` : 'Store',
            vendorId: vendor._id.toString(),
            image: (unit.images && unit.images[0]) || vendor.storeLogo || null,
            isRealEstate: !!isRealEstate,
            businessType: vendor.businessType
        });
    });

    // Optional vendor filter for shop-specific suggestions
    const filteredByVendor = vendorFilterId
        ? suggestions.filter(s => (s.vendorId || '').toString() === vendorFilterId.toString())
        : suggestions;

    // Final sorting and filtering of suggestions
    const finalSuggestions = filteredByVendor.sort((a, b) => {
        const aText = (a.text || '').toLowerCase();
        const bText = (b.text || '').toLowerCase();
        const q = (query || '').toLowerCase();

        // Exact Match (Score 100)
        const aExact = aText === q;
        const bExact = bText === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Starts with (Score 50)
        const aStarts = aText.startsWith(q);
        const bStarts = bText.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Word boundary match (Score 30)
        const boundaryRegex = new RegExp(`\\b${escapedQuery}`, 'i');
        const aBoundary = boundaryRegex.test(aText);
        const bBoundary = boundaryRegex.test(bText);
        if (aBoundary && !bBoundary) return -1;
        if (!aBoundary && bBoundary) return 1;

        // Ends with (Score 20)
        const aEnds = aText.endsWith(q);
        const bEnds = bText.endsWith(q);
        if (aEnds && !bEnds) return -1;
        if (!aEnds && bEnds) return 1;

        // Contains match (Score 10) - Ensures things like "Designer Fancy Saree" show up for "Fancy"
        const aContains = aText.includes(q);
        const bContains = bText.includes(q);
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;

        // Fallback: Alphabetical
        return aText.localeCompare(bText);
    }).slice(0, 60);

    return finalSuggestions;
};
