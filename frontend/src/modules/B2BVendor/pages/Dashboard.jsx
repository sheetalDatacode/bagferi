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
    FiBriefcase
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 xl:w-96">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0 sm:mb-1">Overall Status</p>
                        <p className="text-sm font-black text-slate-800">Operational</p>
                    </div>
                    <button 
                        onClick={() => navigate('/b2b-vendor/subscription')}
                        className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start text-left hover:bg-amber-100 transition-all group shadow-sm active:scale-95"
                    >
                        <p className="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0 sm:mb-1">Nearest Expiry</p>
                        <div className="flex flex-col">
                            <p className="text-sm font-black text-amber-700">
                                {dashboard.subscriptions.length > 0
                                    ? new Date(Math.min(...dashboard.subscriptions.map(s => new Date(s.expiry)))).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'No Active Plan'}
                            </p>
                            {dashboard.subscriptions.length === 0 && (
                                <p className="text-[9px] font-black text-amber-500 uppercase mt-1 underline underline-offset-2">Buy Plan</p>
                            )}
                        </div>
                    </button>
                </div>
            </header>

            {/* ------------------------------------------
                SECTION 2: COMMON OVERVIEW CARDS (STATS)
            ------------------------------------------ */}
            {config.widgets.includes('stats') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Call Inquiries', value: dashboard.overview.callClicks, icon: FiPhone, color: 'text-emerald-600', bg: 'bg-emerald-50', analyticsType: 'call' },
                        { label: 'Total WhatsApp Clicks', value: dashboard.overview.whatsappClicks, icon: FiMessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', analyticsType: 'whatsapp' },
                        { label: 'Total Map Clicks', value: dashboard.overview.mapClicks, icon: FiMapPin, color: 'text-orange-600', bg: 'bg-orange-50', analyticsType: 'map' },
                        { label: 'Wallet Balance', value: `₹${dashboard.walletBalance.toLocaleString('en-IN')}`, icon: FiCreditCard, color: 'text-blue-600', bg: 'bg-blue-50', action: () => navigate('/b2b-vendor/wallet') },
                    ].map((stat, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => stat.action ? stat.action() : (stat.analyticsType && navigate(`/b2b-vendor/analytics/clicks?type=${stat.analyticsType}`))}
                            className={`bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-lg transition-all text-left ${stat.analyticsType || stat.action ? 'cursor-pointer' : 'cursor-default'}`}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {config.enableProductListing && (
                                    <div onClick={() => navigate('/b2b-vendor/products')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FiPackage size={24} /></div>
                                            <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Product Catalog</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.products.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.products.approved} Approved</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.products.pending} Pending</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enablePropertyListing && (
                                    <div onClick={() => navigate('/b2b-vendor/properties')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FiHome size={24} /></div>
                                            <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Commercial Portfolio</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.properties.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.properties.approved} Active</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.properties.pending} Review</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enableLotSlotListing && (
                                    <div onClick={() => navigate('/b2b-vendor/lotslot')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FiHash size={24} /></div>
                                            <button className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <FiArrowUpRight size={20} />
                                            </button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lots / Slots</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.lotSlot.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.lotSlot.approved} Active</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enableReels && (
                                    <div onClick={() => navigate('/b2b-vendor/reels')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><FiVideo size={24} /></div>
                                            <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Reels & Media</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.reels.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.reels.approved} Approved</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.reels.pending} Review</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enableJobListing && (
                                    <div onClick={() => navigate('/b2b-vendor/jobs')} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-teal-100 text-teal-600 rounded-xl"><FiBriefcase size={24} /></div>
                                            <button className="text-slate-400 group-hover:text-slate-900 transition-colors"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Job Postings</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.jobs.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.jobs.approved} Active</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.jobs.pending} Hidden</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                    {config.widgets.includes('alerts') && (
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 px-2 border-l-4 border-primary-600 pl-4">Action Center</h2>
                            {dashboard.alerts.length > 0 && (
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-4">
                                    {dashboard.alerts.map((alert, idx) => (
                                        <div key={alert.id || idx} className={`p-5 rounded-3xl border flex gap-4 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                            <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <FiAlertCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert.message}</p>
                                                <button 
                                                    onClick={() => alert.actionLink && navigate(alert.actionLink)}
                                                    className={`mt-2 text-[10px] font-black text-slate-900 uppercase underline underline-offset-4 decoration-slate-300 ${alert.actionLink ? 'cursor-pointer' : 'cursor-default'}`}
                                                >
                                                    Take Action
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ------------------------------------------
                        SECTION 7: QUICK ACTIONS
                    ------------------------------------------ */}
                    {config.widgets.includes('quick_actions') && (
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                            <h2 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-6 ml-2">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {config.enablePropertyListing ? (
                                    <>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/properties/add-commercial')}
                                            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Property</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/properties/add-flat')}
                                            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Flat</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/properties/add-villa')}
                                            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Villa</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/properties/add-plot')}
                                            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700"
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Plot</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => config.enableProductListing && navigate('/b2b-vendor/products/add-product')}
                                            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${config.enableProductListing ? 'bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700' : 'opacity-30 cursor-not-allowed bg-slate-800'}`}
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Product</span>
                                        </button>
                                        <button
                                            onClick={() => config.enableLotSlotListing && navigate('/b2b-vendor/lotslot/add-lotslot')}
                                            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${config.enableLotSlotListing ? 'bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700' : 'opacity-30 cursor-not-allowed bg-slate-800'}`}
                                        >
                                            <FiPlus size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">Add Lot/Slot</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------
                        SECTION 5: BANNER & PROMOTION (CONDITIONAL)
                    ------------------------------------------ */}
                    {config.widgets.includes('banner_promo') && (
                        config.enableBanner ? (
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Active Promotion</h2>
                                <div className="space-y-6">
                                    {dashboard.banners.length > 0 ? dashboard.banners.map((banner, i) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-primary-400 flex-shrink-0">
                                                <FiImage size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">{banner.title}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-2">{banner.type} • Ads</p>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                    <FiCalendar size={12} /> {new Date(banner.expiry).toLocaleDateString('en-GB')}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">No Active Banners</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => navigate('/b2b-vendor/banner-booking')}
                                        className="w-full py-4 bg-white text-slate-800 rounded-2xl border-2 border-slate-200 border-dashed hover:border-slate-800 hover:text-slate-900 transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <FiPlus /> New Campaign
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 border-dashed text-center">
                                <FiImage className="text-slate-300 text-4xl mx-auto mb-4 opacity-50" />
                                <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed">Banner promotions are not allowed for your business type.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorDashboard;
