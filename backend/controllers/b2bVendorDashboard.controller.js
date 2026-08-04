import Product from '../models/Product.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Notification from '../models/Notification.model.js';
import Vendor from '../models/Vendor.model.js';
import ShopUnit from '../models/ShopUnit.model.js';
import SecureDeal from '../models/SecureDeal.model.js';
import VendorWallet from '../models/VendorWallet.model.js';
import Reel from '../models/Reel.model.js';
import Order from '../models/Order.model.js';

/**
 * Get B2B Vendor Dashboard Data
 * GET /api/vendor/dashboard
 */
export const getDashboardData = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;

        // 1. Get List Statistics (Counts) & Financial Data
        const [
            activeBanners,
            subscriptions,
            notifications,
            vendorAnalytics,
            shop,
            pendingSecureDeals,
            wallet,
            totalReels, approvedReels,
            vendorOrders
        ] = await Promise.all([
            BannerBooking.find({ vendorId, status: 'active' }).populate('slotId').lean(),
            [],
            Notification.find({ recipient: vendorId, recipientType: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean(),
            Vendor.findById(vendorId).select('analytics').lean(),
            ShopUnit.findOne({ vendorId }).select('_id').lean(),
            SecureDeal.countDocuments({ sellerId: vendorId, status: 'pending' }),
            VendorWallet.findOne({ vendorId }).select('balance').lean(),
            Reel.countDocuments({ uploaderId: vendorId, uploaderType: 'vendor' }),
            Reel.countDocuments({ uploaderId: vendorId, uploaderType: 'vendor', status: 'approved' }),
            Order.find({ vendor: vendorId })
                .populate('items.product', 'name images image')
                .populate('user', 'name phone')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        // 2. Fetch and classify products by category
        const products = await Product.find({ vendorId }).populate('category', 'name').lean();
        
        let groceryCount = 0;
        let fashionCount = 0;
        let standardProductCount = 0;

        products.forEach(p => {
            const catName = p.category?.name || '';
            const catNameLower = catName.toLowerCase();
            if (catNameLower.includes('grocery')) {
                groceryCount++;
            } else if (
                catNameLower.includes('fashion') ||
                catNameLower.includes('wear') ||
                catNameLower.includes('clothing') ||
                catNameLower.includes('saree') ||
                catNameLower.includes('shirt') ||
                catNameLower.includes('pant') ||
                catNameLower.includes('garment') ||
                catNameLower.includes('footwear') ||
                catNameLower.includes('shoe') ||
                catNameLower.includes('dress')
            ) {
                fashionCount++;
            } else {
                standardProductCount++;
            }
        });

        // 3. Growth Data (last 7 days order growth)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
            last7Days.push({
                date: dateStr,
                dateObj: d,
                orders: 0,
                revenue: 0
            });
        }

        vendorOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            last7Days.forEach(day => {
                if (orderDate.toDateString() === day.dateObj.toDateString()) {
                    day.orders++;
                    day.revenue += order.totalAmount || 0;
                }
            });
        });

        const growthData = last7Days.map(d => ({
            date: d.date,
            orders: d.orders,
            revenue: d.revenue
        }));

        // Calculate Top Selling Products
        const productSales = {};
        vendorOrders.forEach(order => {
            if (['Accepted', 'Dispatched', 'Completed'].includes(order.status)) {
                order.items?.forEach(item => {
                    if (item.product) {
                        const prodId = item.product._id ? item.product._id.toString() : item.product.toString();
                        if (!productSales[prodId]) {
                            productSales[prodId] = {
                                product: item.product,
                                salesCount: 0,
                                revenue: 0
                            };
                        }
                        productSales[prodId].salesCount += item.quantity || 1;
                        productSales[prodId].revenue += (item.price || 0) * (item.quantity || 1);
                    }
                });
            }
        });

        const topSellingProducts = Object.values(productSales)
            .sort((a, b) => b.salesCount - a.salesCount)
            .slice(0, 5);

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
                    total: products.length,
                    approved: products.filter(p => p.isActive).length,
                    pending: products.filter(p => !p.isActive).length
                },
                grocery: {
                    total: groceryCount
                },
                fashion: {
                    total: fashionCount
                },
                standard: {
                    total: standardProductCount
                },
                secureDeals: {
                    pending: pendingSecureDeals
                },
                reels: {
                    total: totalReels,
                    approved: approvedReels,
                    pending: totalReels - approvedReels
                }
            },
            totalOrders: vendorOrders.length,
            totalRevenue: vendorOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
            recentOrders: vendorOrders.slice(0, 5),
            topSellingProducts,
            growthData,
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
