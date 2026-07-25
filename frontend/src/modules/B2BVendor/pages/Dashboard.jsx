import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    FiPackage,
    FiPlus,
    FiImage,
    FiCheckCircle,
    FiAlertCircle,
    FiPhone,
    FiMessageSquare,
    FiHash,
    FiHome,
    FiCalendar,
    FiMapPin,
    FiArrowUpRight,
    FiCreditCard,
    FiVideo,
    FiBriefcase,
    FiTrendingUp
} from "react-icons/fi";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useVendorSettings } from "../hooks/useVendorSettings";
import { useDashboardStore } from "../store/dashboardStore";
import { useEffect, useState } from "react";
import { getRatingSummary } from "../../../shared/services/ratingService";
import StarRating from "../../../shared/components/StarRating";

const B2BVendorDashboard = () => {
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const { settings, loading: settingsLoading } = useVendorSettings();
    const { data: dashboardData, loading: dashboardLoading, fetchDashboardData } = useDashboardStore();
    const [shopRating, setShopRating] = useState({ averageRating: 0, ratingCount: 0 });

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const fetchRating = async () => {
            const vendorId = vendor?._id || vendor?.id;
            if (vendorId) {
                const res = await getRatingSummary('shop', vendorId);
                if (res) setShopRating(res);
            }
        };
        fetchRating();
    }, [vendor]);

    const loading = settingsLoading || dashboardLoading;

    // Use fetched data or fallback to zeros if data haven't arrived yet
    const dashboard = {
        overview: dashboardData?.overview || { bannerClicks: 0, callClicks: 0, whatsappClicks: 0, mapClicks: 0 },
        walletBalance: dashboardData?.walletBalance || 0,
        counts: {
            products: dashboardData?.counts?.products || { total: 0, approved: 0, pending: 0 },
            lotSlot: dashboardData?.counts?.lotSlot || { total: 0, approved: 0, pending: 0 },
            properties: dashboardData?.counts?.properties || { total: 0, approved: 0, pending: 0 },
            reels: dashboardData?.counts?.reels || { total: 0, approved: 0, pending: 0 },
            jobs: dashboardData?.counts?.jobs || { total: 0, approved: 0, pending: 0 }
        },
        subscriptions: dashboardData?.subscriptions || [],
        banners: dashboardData?.banners || [],
        alerts: dashboardData?.alerts || [],
        hasShop: dashboardData?.hasShop ?? true
    };

    // Add Shop Listing Required alert if missing
    if (dashboardData && !dashboardData.hasShop) {
        const shopAlert = {
            id: 'shop-required',
            type: 'warning',
            message: 'You have not completed your Shop Listing. Please complete the shop setup first to add listings.',
            actionLink: '/b2b-vendor/shop-listing'
        };
        // Add to the beginning of alerts
        if (!dashboard.alerts.some(a => a.id === 'shop-required')) {
            dashboard.alerts.unshift(shopAlert);
        }
    }

    // Add Wallet Empty Alert (Only if NO plan and NO balance)
    if (dashboardData && dashboard.walletBalance === 0 && dashboard.subscriptions.length === 0) {
        const walletAlert = {
            id: 'wallet-empty',
            type: 'warning',
            message: 'Boost your business! You have no active plan and ₹0 balance. Recharge or purchase a plan now to start receiving business enquiries.',
            actionLink: '/b2b-vendor/wallet'
        };
        if (!dashboard.alerts.some(a => a.id === 'wallet-empty')) {
            dashboard.alerts.push(walletAlert);
        }
    }

    // Add Subscription Required Alert (Moved logic inside to avoid duplicate calls to action if both are missing)
    // If wallet is empty and no plan, the above alert covers it. 
    // If they have wallet but no plan, show this.
    if (dashboardData && dashboard.subscriptions.length === 0 && dashboard.walletBalance > 0) {
        const subAlert = {
            id: 'no-subscription',
            type: 'info',
            message: 'You have wallet balance but no active plan. Purchase a plan to maximize your lead generation and product visibility.',
            actionLink: '/b2b-vendor/subscription'
        };
        if (!dashboard.alerts.some(a => a.id === 'no-subscription')) {
            dashboard.alerts.push(subAlert);
        }
    }

    // ==========================================
    // DYNAMIC CONFIG LOGIC (FROM SETTINGS)
    // ==========================================
    const config = settings ? {
        // Feature Flags
        enableProductListing: settings.enabledModules?.includes('product'),
        enablePropertyListing: settings.enabledModules?.includes('property'),
        enableLotSlotListing: settings.enabledModules?.includes('lotslot') || false,
        enableBanner: settings.enabledModules?.includes('banner'),
        enableShopListing: settings.enabledModules?.includes('shop-listing') || false,
        enableReels: true, // Reels are currently always enabled for vendors
        enableJobListing: true, // Always enable job listings

        // Subscription Flags (Usually map to listing modules)
        enableProductSubscription: settings.enabledModules?.includes('product'),
        enablePropertySubscription: settings.enabledModules?.includes('property'),
        enableLotSlotSubscription: settings.enabledModules?.includes('lotslot') || false,
        enableBannerSubscription: settings.enabledModules?.includes('banner'),

        // Widgets
        widgets: settings.dashboardWidgets?.length > 0 ? settings.dashboardWidgets : ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts'],

        // Features
        canAccessAnalytics: settings.features?.canAccessAnalytics ?? true,
        canReceiveLeads: settings.features?.canReceiveLeads ?? true
    } : {
        // Robust Fallback during loading or if config missing
        enableProductListing: true,
        enablePropertyListing: true,
        enableBanner: true,
        enableProductSubscription: true,
        enablePropertySubscription: true,
        enableBannerSubscription: true,
        enableJobListing: true,
        widgets: ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts', 'quick_actions']
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-slate-900"></div>
            </div>
        );
    }

    const growthPoints = dashboardData?.growthData || [];
    const maxRevenue = Math.max(...growthPoints.map(p => p.revenue), 1000);
    const chartHeight = 150;
    const chartWidth = 500;

    const points = growthPoints.map((p, idx) => {
        const x = (idx / Math.max(growthPoints.length - 1, 1)) * chartWidth;
        const y = chartHeight - ((p.revenue / maxRevenue) * chartHeight);
        return { x, y, label: p.date, revenue: p.revenue, orders: p.orders };
    });

    const pathD = points.length > 0 
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    const areaD = points.length > 0
        ? `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
        : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[1400px] mx-auto px-4 sm:px-0 space-y-8 pb-20"
        >
            {/* ------------------------------------------
                SECTION 1: HEADER (ALWAYS VISIBLE)
            ------------------------------------------ */}
            <header className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between gap-6 sm:gap-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 sm:gap-6 text-center sm:text-left">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-2xl sm:rounded-[2rem] flex items-center justify-center shadow-2xl flex-shrink-0">
                        <span className="text-white text-2xl sm:text-3xl font-black">{vendor?.name?.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 w-full lg:w-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span className="truncate max-w-full">{vendor?.name}</span>
                                {vendor?.storeName && (
                                    <span className="text-primary-600 font-extrabold text-base sm:text-xl px-2 sm:px-3 py-0.5 sm:py-1 bg-primary-50 rounded-xl border border-primary-100 shadow-sm whitespace-nowrap">
                                        {vendor.storeName}
                                    </span>
                                )}
                            </h1>
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full w-fit mx-auto sm:mx-0">
                                {vendor?.businessType || 'B2B Vendor'}
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <p className="text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base">
                                <FiCheckCircle className="text-emerald-500 flex-shrink-0" /> Account Verified & Active
                            </p>
                            
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg">
                                <StarRating rating={shopRating.averageRating} size={14} />
                                <span className="text-sm font-black text-amber-700">{shopRating.averageRating.toFixed(1)}</span>
                                <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest">
                                    ({shopRating.ratingCount} Reviews)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------
                SECTION 2: COMMON OVERVIEW CARDS (STATS)
            ------------------------------------------ */}
            {config.widgets.includes('stats') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[
                        { label: 'Wallet Balance', value: `₹${(dashboard.walletBalance || 0).toLocaleString('en-IN')}`, icon: FiCreditCard, color: 'text-blue-600', bg: 'bg-blue-50', action: () => navigate('/b2b-vendor/wallet') },
                        { label: 'Total Products', value: dashboard.counts?.products?.total || 0, icon: FiPackage, color: 'text-emerald-600', bg: 'bg-emerald-50', action: () => navigate('/b2b-vendor/products/manage-products') },
                        { label: 'Total Orders', value: dashboardData?.totalOrders || 0, icon: FiHash, color: 'text-purple-600', bg: 'bg-purple-50', action: () => navigate('/b2b-vendor/orders') },
                        { label: 'Total Revenue', value: `₹${(dashboardData?.totalRevenue || 0).toLocaleString('en-IN')}`, icon: FiTrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
                    ].map((stat, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => stat.action ? stat.action() : null}
                            className={`bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-lg transition-all text-left ${stat.action ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                                <stat.icon />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</h3>
                                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* LEFT COLUMN: LISTINGS & SUBSCRIPTIONS */}
                <div className="xl:col-span-8 space-y-10">

                    {/* ------------------------------------------
                        SECTION 3: CONFIG-BASED LISTING OVERVIEW
                    ------------------------------------------ */}
                    {config.widgets.includes('listings_overview') && (
                        <div>
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Breakdown</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div onClick={() => navigate('/b2b-vendor/products/manage-products')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FiPackage size={24} /></div>
                                        <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Standard Products</h3>
                                    <p className="text-4xl font-black text-slate-900">{dashboardData?.counts?.standard?.total || 0}</p>
                                </div>

                                <div onClick={() => navigate('/b2b-vendor/grocery-products/manage-grocery')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><FiPackage size={24} /></div>
                                        <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Grocery Products</h3>
                                    <p className="text-4xl font-black text-slate-900">{dashboardData?.counts?.grocery?.total || 0}</p>
                                </div>

                                <div onClick={() => navigate('/b2b-vendor/products/manage-products')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FiPackage size={24} /></div>
                                        <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Fashion Products</h3>
                                    <p className="text-4xl font-black text-slate-900">{dashboardData?.counts?.fashion?.total || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------
                        BUSINESS GROWTH CHART
                    ------------------------------------------ */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Growth</h2>
                                <p className="text-xl font-black text-slate-800 mt-1">Order Revenue (Last 7 Days)</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">7 Days</span>
                            </div>
                        </div>
                        
                        {growthPoints.length > 0 ? (
                            <div className="relative pt-4">
                                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 overflow-visible">
                                    <defs>
                                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    
                                    {/* Horizontal grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                        const y = ratio * chartHeight;
                                        return (
                                            <line 
                                                key={idx} 
                                                x1="0" 
                                                y1={y} 
                                                x2={chartWidth} 
                                                y2={y} 
                                                stroke="#f1f5f9" 
                                                strokeWidth="1" 
                                                strokeDasharray="4 4"
                                            />
                                        );
                                    })}
                                    
                                    {/* Area fill */}
                                    <path d={areaD} fill="url(#growthGrad)" />
                                    
                                    {/* Stroke path */}
                                    <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    
                                    {/* Data points */}
                                    {points.map((p, idx) => (
                                        <g key={idx} className="group/point cursor-pointer">
                                            <circle 
                                                cx={p.x} 
                                                cy={p.y} 
                                                r="4" 
                                                fill="#ffffff" 
                                                stroke="#4f46e5" 
                                                strokeWidth="3" 
                                                className="transition-all duration-200 group-hover/point:r-6"
                                            />
                                            {/* Tooltip on hover */}
                                            <title>{p.label}: ₹{p.revenue.toLocaleString('en-IN')} ({p.orders} Orders)</title>
                                        </g>
                                    ))}
                                </svg>
                                
                                {/* X Axis Labels */}
                                <div className="flex justify-between mt-3 px-1">
                                    {points.map((p, idx) => (
                                        <span key={idx} className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{p.label}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400 uppercase text-xs font-bold">
                                No growth data available
                            </div>
                        )}
                    </div>

                    {/* ------------------------------------------
                        NEW ORDERS TABLE
                    ------------------------------------------ */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h2>
                                <p className="text-xl font-black text-slate-800 mt-1">New Orders</p>
                            </div>
                            <button 
                                onClick={() => navigate('/b2b-vendor/orders')}
                                className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                View All Orders
                            </button>
                        </div>
                        
                        {dashboardData?.recentOrders?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Order ID</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Amount</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {dashboardData.recentOrders.map((order) => (
                                            <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6 text-xs font-black text-slate-900 uppercase">#{order._id?.slice(-6)}</td>
                                                <td className="py-4 px-6">
                                                    <p className="text-xs font-bold text-slate-800">{order.user?.name || 'Guest User'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{order.user?.phone}</p>
                                                </td>
                                                <td className="py-4 px-6 text-xs font-medium text-slate-500">
                                                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </td>
                                                <td className="py-4 px-6 text-xs font-black text-slate-800">₹{(order.totalAmount || 0).toLocaleString('en-IN')}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        order.status === 'Completed' || order.status === 'delivered'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : order.status === 'Pending' || order.status === 'pending'
                                                            ? 'bg-amber-50 text-amber-600 font-extrabold'
                                                            : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400 uppercase text-xs font-bold">
                                No new orders received yet
                            </div>
                        )}
                    </div>

                    {/* ------------------------------------------
                        SECTION 4: CONFIG-BASED SUBSCRIPTION OVERVIEW
                    ------------------------------------------ */}
                    {config.widgets.includes('subscription_status') && (
                        <div>
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Active Plans</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {dashboard.subscriptions
                                    .filter(sub => {
                                        if (sub.type === 'product' && !config.enableProductSubscription) return false;
                                        if (sub.type === 'property' && !config.enablePropertySubscription) return false;
                                        if (sub.type === 'lotslot' && !config.enableLotSlotSubscription) return false;
                                        if (sub.type === 'banner' && !config.enableBannerSubscription) return false;
                                        return true;
                                    })
                                    .map((sub, i) => (
                                        <div key={i} className="bg-slate-900 rounded-[2rem] p-8 text-white group overflow-hidden relative">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-primary-400">
                                                    <FiPackage size={20} />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${sub.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {sub.status}
                                                </span>
                                            </div>
                                            <h4 className="text-xl font-black mb-1">{sub.name}</h4>
                                            <p className="text-xs text-slate-400 mb-6 font-medium">Expires {new Date(sub.expiry).toLocaleDateString('en-GB')}</p>

                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex flex-col">
                                                    <span className="text-3xl font-black text-primary-400">{sub.daysLeft}</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Days Remaining</span>
                                                </div>
                                                <button 
                                                    onClick={() => navigate('/b2b-vendor/subscription')}
                                                    className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-colors shadow-lg"
                                                >
                                                    Renew / Upgrade
                                                </button>
                                            </div>

                                            {/* Abstract glow */}
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-400/5 rounded-full blur-3xl -mr-10 -mt-10" />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: BANNERS & ALERTS */}
                <div className="xl:col-span-4 space-y-10">

                    {/* ------------------------------------------
                        SECTION 6: ALERT & ACTION PANEL
                    ------------------------------------------ */}

                    {/* ------------------------------------------
                        SECTION 7: QUICK ACTIONS
                    ------------------------------------------ */}
                    {config.widgets.includes('quick_actions') && (
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                            <h2 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-6 ml-2">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => navigate('/b2b-vendor/products/add-product')}
                                    className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all w-full bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                >
                                    <FiPlus size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Add Product</span>
                                </button>
                                <button
                                    onClick={() => navigate('/b2b-vendor/reels')}
                                    className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all w-full bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                >
                                    <FiPlus size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Add Reel</span>
                                </button>
                                <button
                                    onClick={() => navigate('/b2b-vendor/grocery-products/add-grocery')}
                                    className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all w-full bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700 xl:col-span-2"
                                >
                                    <FiPlus size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Add Grocery</span>
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorDashboard;
