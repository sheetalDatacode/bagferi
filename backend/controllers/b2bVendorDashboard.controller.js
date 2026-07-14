import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import LotSlot from '../models/LotSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Notification from '../models/Notification.model.js';
import Vendor from '../models/Vendor.model.js';
import ShopUnit from '../models/ShopUnit.model.js';
import SecureDeal from '../models/SecureDeal.model.js';
import VendorWallet from '../models/VendorWallet.model.js';
import Reel from '../models/Reel.model.js';
import Job from '../models/Job.model.js';

/**
 * Get B2B Vendor Dashboard Data
 * GET /api/vendor/dashboard
 */
export const getDashboardData = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;

        // 1. Get List Statistics (Counts) & Financial Data
        const [
            totalProducts, approvedProducts,
            totalProperties, approvedProperties,
            totalLotSlots, approvedLotSlots,
            activeBanners,
            subscriptions,
            notifications,
            vendorAnalytics,
            shop,
            pendingSecureDeals,
            wallet,
            totalReels, approvedReels,
            totalJobs, approvedJobs
        ] = await Promise.all([
            Product.countDocuments({ vendorId }),
            Product.countDocuments({ vendorId, isActive: true }),
            Property.countDocuments({ vendorId }),
            Property.countDocuments({ vendorId, isActive: true }),
            LotSlot.countDocuments({ vendorId }),
            LotSlot.countDocuments({ vendorId, isActive: true }),
            BannerBooking.find({ vendorId, status: 'active' }).populate('slotId').lean(),
            VendorSubscription.find({ vendorId, status: 'active' }).populate('planId').lean(),
            Notification.find({ recipient: vendorId, recipientType: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean(),
            Vendor.findById(vendorId).select('analytics').lean(),
            ShopUnit.findOne({ vendorId }).select('_id').lean(),
            SecureDeal.countDocuments({ sellerId: vendorId, status: 'pending' }),
            VendorWallet.findOne({ vendorId }).select('balance').lean(),
            Reel.countDocuments({ uploaderId: vendorId, uploaderType: 'vendor' }),
            Reel.countDocuments({ uploaderId: vendorId, uploaderType: 'vendor', status: 'approved' }),
            Job.countDocuments({ vendorId, isDeleted: false }),
            Job.countDocuments({ vendorId, isDeleted: false, isActive: true })
        ]);

        // Format Data for Frontend
        const dashboardData = {
            hasShop: !!shop,
            walletBalance: wallet?.balance || 0,
            overview: {
                bannerClicks: 0, 
                callClicks: vendorAnalytics?.analytics?.callClicks || 0,
                whatsappClicks: vendorAnalytics?.analytics?.whatsappClicks || 0,
                mapClicks: vendorAnalytics?.analytics?.mapClicks || 0
            },
            counts: {
                products: {
                    total: totalProducts,
                    approved: approvedProducts,
                    pending: totalProducts - approvedProducts
                },
                properties: {
                    total: totalProperties,
                    approved: approvedProperties,
                    pending: totalProperties - approvedProperties
                },
                lotSlot: {
                    total: totalLotSlots,
                    approved: approvedLotSlots,
                    pending: totalLotSlots - approvedLotSlots
                },
                secureDeals: {
                    pending: pendingSecureDeals
                },
                reels: {
                    total: totalReels,
                    approved: approvedReels,
                    pending: totalReels - approvedReels
                },
                jobs: {
                    total: totalJobs,
                    approved: approvedJobs,
                    pending: totalJobs - approvedJobs
                }
            },
            subscriptions: subscriptions.map(sub => ({
                type: sub.planId?.businessType || 'unknown',
                name: sub.planId?.name || 'Active Plan',
                status: sub.status === 'active' ? 'Active' : 'Expiring Soon',
                expiry: sub.endDate,
                daysLeft: Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
            })),
            banners: activeBanners.map(b => ({
                title: b.title || 'Active Banner',
                type: b.slotId?.name || 'Banner',
                expiry: b.endDate
            })),
            alerts: notifications.map(n => ({
                id: n._id,
                type: n.priority === 'high' ? 'warning' : 'info',
                message: n.message
            }))
        };

        // Add expiry alerts if not in notifications
        if (dashboardData.subscriptions.length > 0) {
            dashboardData.subscriptions.forEach(sub => {
                if (sub.daysLeft <= 7) {
                    dashboardData.alerts.push({
                        id: `expiry-${sub.type}`,
                        type: 'warning',
                        message: `Your "${sub.name}" plan is expiring in ${sub.daysLeft} days.`
                    });
                }
            });
        }

        res.status(200).json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error fetching vendor dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};
