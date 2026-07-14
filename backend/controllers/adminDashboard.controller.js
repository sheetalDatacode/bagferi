import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Transaction from '../models/Transaction.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import LotSlot from '../models/LotSlot.model.js';
import VendorAddon from '../models/VendorAddon.model.js';
import Reel from '../models/Reel.model.js';
import ReelReport from '../models/ReelReport.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';
import Feedback from '../models/Feedback.model.js';
import Job from '../models/Job.model.js';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

/**
 * Get Admin Dashboard Summary
 * @route GET /api/admin/reports/dashboard-summary
 * @access Private/Admin
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
    // Fetch all active categories defined by Admin first
    const activeCategories = await B2BCategory.find({ isActive: true }).select('name').lean();
    const categoryNames = activeCategories.map(c => c.name);

    // Optimize: Fetch ALL counts, aggregations, and revenue stats in a single parallel block for maximum performance
    const [
        totalCustomers,
        totalVendors,
        totalProducts,
        totalProperties,
        activeBanners,
        recentVendors,
        activeVendors,
        activeProducts,
        activeProperties,
        vendorDistribution,
        topCategoriesRaw,
        topLocationsRaw,
        revenueResult,
        activeSubscriptionsCount,
        totalLotSlots,
        activeLotSlots,
        totalReels,
        activeReels,
        totalJobs
    ] = await Promise.all([
        User.countDocuments(),
        Vendor.countDocuments({ vendorType: { $ne: 'admin' } }),
        Product.countDocuments(),
        Property.countDocuments(),
        BannerBooking.countDocuments({
            status: 'active',
            paymentStatus: 'paid',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        }),
        Vendor.find({ vendorType: { $ne: 'admin' } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email storeName createdAt status vendorType phone')
            .lean(),
        Vendor.countDocuments({ vendorType: { $ne: 'admin' }, status: 'approved' }),
        Product.countDocuments({ isActive: true }),
        Property.countDocuments({ isActive: true }),
        Vendor.aggregate([
            { $match: { vendorType: { $ne: 'admin' } } },
            { $group: { _id: { $ifNull: ['$businessType', 'General'] }, count: { $sum: 1 } } }
        ]),
        // Top categories based on Admin defined categories
        Product.aggregate([
            {
                $match: {
                    isActive: true, // Only count active products
                    category: { $in: categoryNames } // Use indexed field
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        // Top 5 Property Locations
        Property.aggregate([
            {
                $group: {
                    _id: { $ifNull: ['$location.city', 'Unknown'] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),
        // Real revenue calculation from Transactions
        Transaction.aggregate([
            { $match: { status: 'completed', type: 'payment' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        VendorSubscription.countDocuments({ status: 'active' }),
        LotSlot.countDocuments(),
        LotSlot.countDocuments({ isActive: true }),
        Reel.countDocuments(),
        Reel.countDocuments({ status: 'approved' }),
        Job.countDocuments()
    ]);

    // Format vendor distribution for frontend based on business type
    const formattedVendorDistribution = vendorDistribution.map((v, index) => ({
        name: v._id,
        value: v.count,
        color: COLORS[index % COLORS.length]
    }));

    // Create a map of aggregation results
    const countsMap = topCategoriesRaw.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    // Ensure all admin categories are represented, even with 0 products
    const topCategories = categoryNames.map(name => ({
        name: name,
        views: countsMap[name] || 0
    })).sort((a, b) => b.views - a.views).slice(0, 10);

    // Format top locations
    const topLocations = topLocationsRaw.map(l => ({
        name: l._id,
        views: l.count
    }));

    // Real revenue: sum totalAmount from paid subscriptions + banner bookings + addons + wallet recharges
    const [subRevenueResult, bannerRevenueResult, addonRevenueResult, walletRevenueResult] = await Promise.all([
      VendorSubscription.aggregate([
        { $match: { 
          status: { $in: ['active', 'expired'] }, 
          totalAmount: { $gt: 0 },
          paymentMethod: { $nin: ['wallet', 'free'] } 
        } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      BannerBooking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      VendorAddon.aggregate([
        { $match: { 
          status: { $ne: 'failed' }, 
          totalAmount: { $gt: 0 },
          paymentMethod: { $ne: 'wallet' }
        } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      VendorWalletTransaction.aggregate([
        { $match: { referenceType: 'recharge', type: 'credit' } },
        { $group: { 
          _id: null, 
          total: { $sum: { $ifNull: ["$metadata.totalAmount", { $multiply: ["$amount", 1.18] }] } } 
        } }
      ])
    ]);

    const totalRevenue = (subRevenueResult[0]?.total || 0) +
                         (bannerRevenueResult[0]?.total || 0) +
                         (addonRevenueResult[0]?.total || 0) +
                         (walletRevenueResult[0]?.total || 0);

    // Dynamic Revenue Data (Last 6 Months) from VendorSubscription Audit Logs
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); 
    sixMonthsAgo.setDate(1); 

    const revenueAggregation = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
            $match: {
                'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
                'auditLogs.details.status': 'completed',
                'auditLogs.timestamp': { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: '$auditLogs.timestamp' },
                    year: { $year: '$auditLogs.timestamp' }
                },
                totalRevenue: { $sum: '$auditLogs.details.amount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format revenue data for the chart (ensure all 6 months are present)
    const revenueData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthIndex = d.getMonth();
        const year = d.getFullYear();

        const foundData = revenueAggregation.find(r => r._id.month === (monthIndex + 1) && r._id.year === year);

        revenueData.push({
            name: monthNames[monthIndex],
            revenue: foundData ? foundData.totalRevenue : 0,
            fullDate: `${monthNames[monthIndex]} ${year}`
        });
    }

    // Combined Payment History — subscriptions + banners + addons, payment status only
    const [recentSubs, recentBanners, recentAddons] = await Promise.all([
        VendorSubscription.find({ status: { $in: ['active', 'expired'] }, totalAmount: { $gt: 0 } })
            .sort({ lastPaymentDate: -1, createdAt: -1 })
            .limit(8)
            .populate('vendorId', 'name storeName email')
            .populate('planId', 'name')
            .lean(),
        BannerBooking.find({ paymentStatus: 'paid' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('vendorId', 'name storeName email')
            .lean(),
        VendorAddon.find({ status: { $ne: 'failed' }, totalAmount: { $gt: 0 } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('vendorId', 'name storeName email')
            .populate('addonPlanId', 'name')
            .lean()
    ]);

    const combinedHistory = [
        ...recentSubs.map(s => ({
            id: s._id,
            amount: s.totalAmount || 0,
            type: 'subscription',
            label: `Subscription — ${s.planId?.name || 'Plan'}`,
            method: s.paymentMethod || 'Razorpay',
            date: s.lastPaymentDate || s.createdAt,
            status: 'completed',   // payment was made, subscription may expire later
            user: s.vendorId?.storeName || s.vendorId?.name || 'Vendor',
            userEmail: s.vendorId?.email,
            zohoInvoiceId: s.zohoInvoiceId
        })),
        ...recentBanners.map(b => ({
            id: b._id,
            amount: b.amount || 0,
            type: 'banner',
            label: `Banner — ${b.title || b.bannerType?.toUpperCase() || 'Booking'}`,
            method: b.paymentMethod || 'Razorpay',
            date: b.createdAt,
            status: 'completed',
            user: b.vendorId?.storeName || b.vendorId?.name || 'Vendor',
            userEmail: b.vendorId?.email,
            zohoInvoiceId: b.zohoInvoiceId
        })),
        ...recentAddons.map(a => ({
            id: a._id,
            amount: a.totalAmount || 0,
            type: 'addon',
            label: `Add-on — ${a.addonPlanId?.name || a.featureType || 'Pack'}`,
            method: a.paymentMethod || 'Razorpay',
            date: a.purchaseDate || a.createdAt,
            status: 'completed',
            user: a.vendorId?.storeName || a.vendorId?.name || 'Vendor',
            userEmail: a.vendorId?.email,
            zohoInvoiceId: a.zohoInvoiceId
        })),
        ...(await VendorWalletTransaction.find({ referenceType: 'recharge' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('vendorId', 'name storeName email')
            .lean()).map(r => ({
                id: r._id,
                amount: r.metadata?.totalAmount || Math.round(r.amount * 1.18 * 100) / 100,
                type: 'recharge',
                label: 'Wallet Recharge',
                method: 'Razorpay',
                date: r.createdAt,
                status: 'completed',
                user: r.vendorId?.storeName || r.vendorId?.name || 'Vendor',
                userEmail: r.vendorId?.email,
                zohoInvoiceId: r.zohoInvoiceId
            }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

    res.status(200).json({
        success: true,
        data: {
            summary: {
                totalCustomers,
                totalVendors,
                totalProducts,
                totalProperties,
                activeBanners,
                activeVendors,
                activeProducts,
                activeProperties,
                totalRevenue,
                activeSubscriptionsCount,
                totalLotSlots,
                activeLotSlots,
                totalReels,
                activeReels,
                totalJobs
            },
            vendorDistribution: formattedVendorDistribution,
            recentVendors,
            paymentHistory: combinedHistory,
            performance: {
                topCategories: topCategories.length ? topCategories : [{ name: 'No Product Added Yet', views: 0 }],
                topLocations: topLocations.length ? topLocations : [{ name: 'No Data', views: 0 }]
            },
            revenueData: revenueData
        }
    });
});

/**
 * Get Sidebar Notification Counts
 * @route GET /api/admin/reports/sidebar-counts
 * @access Private/Admin
 */
export const getSidebarCounts = asyncHandler(async (req, res) => {
    const [
        pendingVendors,
        pendingBanners,
        pendingReels,
        pendingReports,
        pendingFeedbacks
    ] = await Promise.all([
        Vendor.countDocuments({ status: 'pending', vendorType: { $ne: 'admin' } }),
        BannerBooking.countDocuments({ status: 'pending', paymentStatus: 'paid' }),
        Reel.countDocuments({ status: 'pending' }),
        ReelReport.countDocuments({ status: 'pending' }),
        Feedback.countDocuments({ status: 'pending' })
    ]);

    res.status(200).json({
        success: true,
        data: {
            pendingVendors,
            pendingBanners,
            pendingReels,
            pendingReports,
            pendingFeedbacks
        }
    });
});
