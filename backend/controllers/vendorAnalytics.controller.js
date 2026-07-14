import Vendor from '../models/Vendor.model.js';
import notificationService from '../services/notification.service.js';
import VendorContactClick from '../models/VendorContactClick.model.js';
import vendorAddonService from '../services/vendorAddon.service.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import mongoose from 'mongoose';

const getIndiaDateKey = (date = new Date()) => {
    // YYYY-MM-DD in Asia/Kolkata
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    } catch {
        // Fallback: server local date (still stable)
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
};

/**
 * Track vendor contact clicks (call, whatsapp or map)
 * POST /api/vendor/analytics/track-click
 *
 * Body: { vendorId, clickType: 'call' | 'whatsapp' | 'map', itemType?, itemId? }
 */
export const trackContactClick = async (req, res, next) => {
    try {
        const { vendorId, clickType, itemType, itemId, category } = req.body;

        if (!vendorId || !clickType) {
            return res.status(400).json({
                success: false,
                message: 'vendorId and clickType are required'
            });
        }

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        // --- STEP 1: Dedup check FIRST (before any counter increment) ---
        // call/whatsapp are billable — deduped per user per vendor per day
        // map is never deduped — always increments
        const isBillableClick = clickType === 'call' || clickType === 'whatsapp';
        const userId = req.user ? (req.user.id || req.user.vendorId || req.user.adminId) : null;
        const dateKey = getIndiaDateKey(new Date());
        let isNewEnquiry = false;
        let enquiryConsumed = false;

        if (isBillableClick) {
            if (userId) {
                // Has this user already contacted this vendor today (any clickType) for this category?
                const existingToday = await VendorContactClick.findOne(
                    { vendorId, userId, dateKey, category, isNewEnquiry: true },
                    { _id: 1 }
                ).lean();

                if (!existingToday) {
                    isNewEnquiry = true; // First click of this user today
                }
                
                // Has ANY click for this user+vendor+date already BEEN CONSUMED (paid)?
                const alreadyPaid = await VendorContactClick.findOne(
                    { vendorId, userId, dateKey, enquiryConsumed: true },
                    { _id: 1 }
                ).lean();
                
                if (alreadyPaid) {
                    enquiryConsumed = true;
                }
            } else {
                // Anonymous user — no dedup possible, every click counts as new but we don't consume from quota without userId
                isNewEnquiry = true;
            }
        }

        // --- STEP 2: Increment vendor analytics ONLY when warranted ---
        // For call/whatsapp: only on the first click of the day (isNewEnquiry)
        // For map: always increment (no dedup)
        const shouldIncrement = !isBillableClick || isNewEnquiry;

        const updateField =
            clickType === 'call'
                ? 'analytics.callClicks'
                : clickType === 'whatsapp'
                    ? 'analytics.whatsappClicks'
                    : 'analytics.mapClicks';

        let updatedVendor = null;
        if (shouldIncrement) {
            updatedVendor = await Vendor.findByIdAndUpdate(
                vendorId,
                { $inc: { [updateField]: 1 } },
                { new: true, select: 'storeName analytics' }
            );

            if (!updatedVendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
        } else {
            // Repeated click — still need vendor for response/notification
            updatedVendor = await Vendor.findById(vendorId).select('storeName').lean();
            if (!updatedVendor) {
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }
        }

        // --- STEP 3: Consume enquiry unit (if billable, not yet paid today, and userId exists) ---
        if (isBillableClick && userId && !enquiryConsumed) {
            const { default: subscriptionRulesService } = await import('../services/subscriptionRules.service.js');
            enquiryConsumed = await subscriptionRulesService.consumeEnquiry(vendorId, clickType);
        }

        res.status(200).json({
            success: true,
            isNewEnquiry,
            enquiryConsumed,
            message: `${clickType} click tracked successfully`
        });

        // --- STEP 4: Store raw click record (always, for full analytics history) ---
        try {
            const safeItemType = ['product', 'lotslot', 'property', 'vendor', 'reel'].includes(itemType)
                ? itemType
                : 'unknown';

            await VendorContactClick.create({
                vendorId,
                clickType,
                userId,
                userRole: req.user ? req.user.role : null,
                dateKey,
                itemType: safeItemType,
                itemId: itemId || null,
                category: category || null,
                isNewEnquiry,
                enquiryConsumed: userId ? !!enquiryConsumed : true
            });
        } catch (e) {
            console.error('VendorContactClick create error:', e?.message || e);
        }

        // --- STEP 5: Notify user only on first enquiry of the day ---
        if (isNewEnquiry && req.user && req.user.role === 'user') {
            const uid = req.user.id;
            notificationService.createNotification({
                recipientId: uid,
                recipientType: 'user',
                type: 'system',
                title: 'Contact Request Logged 📞',
                message: `You recently tried to contact "${updatedVendor?.storeName}" via ${clickType}. Don't forget to follow up for the best quotes!`,
                actionUrl: `/b2b/vendor/${vendorId}`
            }).catch(e => console.error('Notification Error:', e.message));
        }
    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track click',
            error: error.message
        });
    }
};

/**
 * Get unique users who clicked contact buttons (dedup by user+date)
 * GET /api/vendor/analytics/click-users?clickType=call|whatsapp|map&page&limit&dateFrom&dateTo
 * (Vendor auth)
 */
export const getClickUsers = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const {
            clickType,
            page = 1,
            limit = 50,
            dateFrom,
            dateTo
        } = req.query;

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        const numericPage = Math.max(1, parseInt(page, 10) || 1);
        const numericLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (numericPage - 1) * numericLimit;

        const match = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            clickType,
        };

        const fromKey = dateFrom ? String(dateFrom).trim() : null;
        const toKey = dateTo ? String(dateTo).trim() : null;
        if (fromKey || toKey) {
            match.dateKey = {};
            if (fromKey) match.dateKey.$gte = fromKey;
            if (toKey) match.dateKey.$lte = toKey;
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' },
                    clickCount: { $sum: 1 },
                    lastClickAt: { $max: '$createdAt' },
                    itemType: { $first: '$itemType' },
                    enquiryConsumed: { $max: '$enquiryConsumed' }
                }
            },
            { $sort: { '_id.dateKey': -1, lastClickAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'vData'
                }
            },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$vData', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    matchedUser: { $ifNull: ['$userData', '$vData'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    dateKey: '$_id.dateKey',
                    category: '$_id.category',
                    clickCount: 1,
                    lastClickAt: 1,
                    user: {
                        _id: '$matchedUser._id',
                        name: { 
                            $cond: [
                                { $or: [{ $eq: ['$enquiryConsumed', true] }, { $not: ['$_id.userId'] }] },
                                { $ifNull: ['$matchedUser.name', 'Anonymous Visitor'] },
                                { $concat: ["Locked Enquiry (", { $ifNull: ["$matchedUser.name", "User"] }, ")"] }
                            ]
                        },
                        email: {
                            $cond: [
                                { $or: [{ $eq: ['$enquiryConsumed', true] }, { $not: ['$_id.userId'] }] },
                                { $ifNull: ['$matchedUser.email', 'N/A'] },
                                'RECHARGE TO VIEW'
                            ]
                        },
                        phone: {
                            $cond: [
                                { $or: [{ $eq: ['$enquiryConsumed', true] }, { $not: ['$_id.userId'] }] },
                                { $ifNull: ['$matchedUser.phone', 'N/A'] },
                                'RECHARGE TO VIEW'
                            ]
                        },
                        isLocked: { 
                            $and: [
                                { $ne: ['$enquiryConsumed', true] },
                                { $gt: ['$_id.userId', null] } 
                            ]
                        }
                    },
                    itemType: 1,
                    enquiryConsumed: 1,
                }
            },
            { $skip: skip },
            { $limit: numericLimit },
        ];

        const countPipeline = [
            { $match: match },
            { $group: { _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' } } },
            { $count: 'total' }
        ];

        const [items, countRes] = await Promise.all([
            VendorContactClick.aggregate(pipeline),
            VendorContactClick.aggregate(countPipeline),
        ]);

        const total = countRes?.[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page: numericPage,
                    limit: numericLimit,
                    total,
                    totalPages: Math.ceil(total / numericLimit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching click users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch click users',
            error: error.message
        });
    }
};

/**
 * Admin: Get unique users who clicked contact buttons for a specific vendor
 * GET /api/admin/analytics/vendor-contact/:vendorId/click-users?clickType=call|whatsapp|map&page&limit&dateFrom&dateTo
 * (Admin auth)
 */
export const getClickUsersForVendorAdmin = async (req, res, next) => {
    try {
        const { vendorId } = req.params;
        const {
            clickType,
            page = 1,
            limit = 50,
            dateFrom,
            dateTo
        } = req.query;

        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vendorId'
            });
        }

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        const numericPage = Math.max(1, parseInt(page, 10) || 1);
        const numericLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (numericPage - 1) * numericLimit;

        const match = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            clickType,
        };

        const fromKey = dateFrom ? String(dateFrom).trim() : null;
        const toKey = dateTo ? String(dateTo).trim() : null;
        if (fromKey || toKey) {
            match.dateKey = {};
            if (fromKey) match.dateKey.$gte = fromKey;
            if (toKey) match.dateKey.$lte = toKey;
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' },
                    clickCount: { $sum: 1 },
                    lastClickAt: { $max: '$createdAt' },
                    itemType: { $first: '$itemType' },
                    enquiryConsumed: { $max: '$enquiryConsumed' }
                }
            },
            { $sort: { '_id.dateKey': -1, lastClickAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'vData'
                }
            },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$vData', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    matchedUser: { $ifNull: ['$userData', '$vData'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    dateKey: '$_id.dateKey',
                    category: '$_id.category',
                    clickCount: 1,
                    lastClickAt: 1,
                    user: {
                        _id: '$matchedUser._id',
                        name: { 
                            $cond: [
                                { $eq: ['$enquiryConsumed', true] },
                                { $ifNull: ['$matchedUser.name', 'Anonymous Visitor'] },
                                { $concat: ["Locked Enquiry (", { $ifNull: ["$matchedUser.name", "User"] }, ")"] }
                            ]
                        },
                        email: {
                            $cond: [
                                { $eq: ['$enquiryConsumed', true] },
                                { $ifNull: ['$matchedUser.email', 'N/A'] },
                                'RECHARGE TO VIEW'
                            ]
                        },
                        phone: {
                            $cond: [
                                { $eq: ['$enquiryConsumed', true] },
                                { $ifNull: ['$matchedUser.phone', 'N/A'] },
                                'RECHARGE TO VIEW'
                            ]
                        },
                        isLocked: { $ne: ['$enquiryConsumed', true] }
                    },
                    itemType: 1,
                    enquiryConsumed: 1,
                }
            },
            { $skip: skip },
            { $limit: numericLimit },
        ];

        const countPipeline = [
            { $match: match },
            { $group: { _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' } } },
            { $count: 'total' }
        ];

        const [items, countRes] = await Promise.all([
            VendorContactClick.aggregate(pipeline),
            VendorContactClick.aggregate(countPipeline),
        ]);

        const total = countRes?.[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page: numericPage,
                    limit: numericLimit,
                    total,
                    totalPages: Math.ceil(total / numericLimit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching click users for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch click users',
            error: error.message
        });
    }
};

/**
 * Get vendor analytics
 * GET /api/vendor/analytics
 */
export const getVendorAnalytics = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;

        const vendor = await Vendor.findById(vendorId).select('analytics').lean();

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                callClicks: vendor.analytics?.callClicks || 0,
                whatsappClicks: vendor.analytics?.whatsappClicks || 0,
                mapClicks: vendor.analytics?.mapClicks || 0
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

/**
 * Get vendor enquiry stats — unique new enquiries count + addon quota remaining
 * GET /api/vendor/analytics/enquiry-stats
 * (Vendor auth)
 */
export const getEnquiryStats = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const todayKey = getIndiaDateKey(new Date());

        // Count unique new enquiries today
        const todayEnquiries = await VendorContactClick.countDocuments({
            vendorId,
            isNewEnquiry: true,
            dateKey: todayKey,
        });

        // Count total new enquiries this month
        const nowIST = new Date();
        const monthStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
            .format(new Date(nowIST.getFullYear(), nowIST.getMonth(), 1));
        const monthlyEnquiries = await VendorContactClick.countDocuments({
            vendorId,
            isNewEnquiry: true,
            dateKey: { $gte: monthStart },
        });

        // 3. Remaining enquiry addon quota
        const addonQuotaRemaining = await vendorAddonService.getTotalAvailableAddonUnits(
            vendorId,
            'enquiry'
        );

        // Fetch plan's enquiry limit and usage
        let planEnquiryLimit = 0;
        let planEnquiryIsUnlimited = false;
        let planEnquiryUsed = 0;
        
        // 4. Wallet Balance and Units
        let walletBalance = 0;
        let enquiryPrice = 1; // Default fallback ₹1
        try {
            const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
            walletBalance = wallet.balance || 0;

            const { default: subscriptionRulesService } = await import('../services/subscriptionRules.service.js');
            
            // Get Plan Limits
            const status = await subscriptionRulesService.getSubscriptionStatus(vendorId);
            const el = status?.limits?.enquiry;
            if (el) {
                planEnquiryLimit = el.planLimit ?? 0;
                planEnquiryIsUnlimited = el.isUnlimited ?? false;
            }

            const subData = await subscriptionRulesService.getActiveSubscription(vendorId);
            if (subData?.subscription) {
                planEnquiryUsed = subData.subscription.usage?.enquiriesUsed || 0;
            }
            
            if (subData?.plan?.enquiryPrice > 0) {
                enquiryPrice = subData.plan.enquiryPrice;
            }
        } catch (e) {
            console.error('Error fetching wallet/price for stats:', e?.message);
        }

        const walletUnits = Math.floor(walletBalance / enquiryPrice);

        res.status(200).json({
            success: true,
            data: {
                todayEnquiries,
                monthlyEnquiries,
                addonQuotaRemaining,
                walletBalance,
                enquiryPrice,
                // Plan-level enquiry info
                planEnquiryLimit,          // 0 = not included, -1 = unlimited, N = cap per cycle
                planEnquiryIsUnlimited,    // true when plan gives unlimited enquiries
                planEnquiryUsed,           // Units used from plan quota
                // Effective remaining = (plan limit - used) + addon units + potential wallet units
                effectiveQuota: planEnquiryIsUnlimited ? -1 : (Math.max(0, planEnquiryLimit - planEnquiryUsed) + addonQuotaRemaining + walletUnits),
            }
        });
    } catch (error) {
        console.error('Error fetching enquiry stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiry stats',
            error: error.message
        });
    }
};


/**
 * Unlock a specific lead by consuming quota
 * POST /api/vendor/analytics/unlock-enquiry
 * Body: { userId, dateKey }
 */
export const unlockEnquiry = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const { userId, dateKey } = req.body;

        if (!userId || !dateKey) {
            return res.status(400).json({
                success: false,
                message: 'userId and dateKey are required'
            });
        }

        // Check if already consumed for this combo
        const alreadyConsumed = await VendorContactClick.findOne({
            vendorId,
            userId: new mongoose.Types.ObjectId(userId),
            dateKey,
            enquiryConsumed: true
        });

        if (alreadyConsumed) {
            return res.status(400).json({
                success: false,
                message: 'This enquiry is already unlocked'
            });
        }

        // Identify original click type for better history logs
        const originalClicks = await VendorContactClick.find({
            vendorId,
            userId: new mongoose.Types.ObjectId(userId),
            dateKey
        }).select('clickType').lean();
        
        const clickType = originalClicks.find(c => c.clickType === 'whatsapp') ? 'whatsapp' : 
                         originalClicks.find(c => c.clickType === 'call') ? 'call' : null;

        // Try to consume 1 unit (Plan first, then Addon)
        const { default: subscriptionRulesService } = await import('../services/subscriptionRules.service.js');
        const success = await subscriptionRulesService.consumeEnquiry(vendorId, clickType);

        if (!success) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient enquiry quota. Please recharge your wallet and buy an enquiry add-on.'
            });
        }

        // Update all records for this user+vendor+date to consumed
        await VendorContactClick.updateMany(
            {
                vendorId,
                userId: new mongoose.Types.ObjectId(userId),
                dateKey
            },
            { $set: { enquiryConsumed: true } }
        );

        res.status(200).json({
            success: true,
            message: 'Enquiry unlocked successfully'
        });
    } catch (error) {
        console.error('Error unlocking enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unlock enquiry',
            error: error.message
        });
    }
};
