import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiPhone, FiMessageSquare, FiMapPin, FiUsers, FiAlertCircle, FiPackage, FiX, FiPlusCircle, FiCreditCard } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";
import subscriptionService from "../services/subscriptionService";
import vendorWalletService from "../services/vendorWalletService";
import { useSubscriptionStore } from "../store/subscriptionStore";

const CLICK_TYPES = {
    call: {
        label: "Call Visitors",
        icon: FiPhone,
        color: "text-emerald-600",
    },
    whatsapp: {
        label: "WhatsApp Visitors",
        icon: FiMessageSquare,
        color: "text-green-600",
    },
    map: {
        label: "Map Visitors",
        icon: FiMapPin,
        color: "text-orange-600",
    },
};

const B2BVendorContactAnalytics = ({ mode = "vendor" }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialType = searchParams.get("type");
    const normalizedType = initialType && CLICK_TYPES[initialType] ? initialType : "whatsapp";

    const [clickType, setClickType] = useState(normalizedType);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Enquiry stats (vendor mode only)
    const [enquiryStats, setEnquiryStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [unlockingIds, setUnlockingIds] = useState({});
    
    // Quota Modal State
    const [showQuotaModal, setShowQuotaModal] = useState(false);
    const [enquiryPlans, setEnquiryPlans] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isPurchasing, setIsPurchasing] = useState(false);
    
    // Get full subscription status from store
    const { status: subStatus } = useSubscriptionStore();

    useEffect(() => {
        if (clickType !== normalizedType) {
            setSearchParams({ type: clickType });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clickType]);

    // Fetch enquiry stats on mount (vendor mode only)
    useEffect(() => {
        if (mode !== 'vendor') return;
        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                const res = await api.get('/vendor/analytics/enquiry-stats');
                if (res?.success) setEnquiryStats(res.data);
            } catch (e) {
                console.error('Failed to load enquiry stats:', e?.message);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
        loadQuotaData();
    }, [mode]);

    const loadQuotaData = async () => {
        if (mode !== 'vendor') return;
        try {
            const [plans, wallet] = await Promise.all([
                subscriptionService.getAddonPlans('enquiry'),
                vendorWalletService.getMyWallet()
            ]);
            setEnquiryPlans(plans || []);
            setWalletBalance(wallet?.balance || 0);
        } catch (e) {
            console.error('Failed to load quota data:', e);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const isAdmin = mode === "admin" && id;
                const url = isAdmin
                    ? `/admin/analytics/vendor-contact/${id}/click-users`
                    : "/vendor/analytics/click-users";

                const response = await api.get(url, {
                    params: { clickType, page: 1, limit: 100 },
                });
                if (response?.success) {
                    setItems(response.data?.items || []);
                } else {
                    setError(response?.message || "Failed to load visitors");
                }
            } catch (e) {
                setError(e?.message || "Failed to load visitors");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clickType]);

    const handleUnlock = async (row) => {
        const userId = row.user?._id;
        const dateKey = row.dateKey;
        if (!userId || !dateKey) return;

        setUnlockingIds(prev => ({ ...prev, [`${dateKey}-${userId}`]: true }));
        try {
            const res = await api.post('/vendor/analytics/unlock-enquiry', { userId, dateKey });
            if (res.success) {
                toast.success('Lead unlocked successfully!');
                // Refresh everything
                const statsRes = await api.get('/vendor/analytics/enquiry-stats');
                if (statsRes?.success) setEnquiryStats(statsRes.data);
                
                const url = mode === "admin" && id
                    ? `/admin/analytics/vendor-contact/${id}/click-users`
                    : "/vendor/analytics/click-users";
                const response = await api.get(url, {
                    params: { clickType, page: 1, limit: 100 },
                });
                if (response?.success) setItems(response.data?.items || []);
            } else {
                if (res.message?.toLowerCase().includes('insufficient enquiry quota')) {
                    setShowQuotaModal(true);
                    loadQuotaData();
                } else {
                    toast.error(res.message || 'Failed to unlock lead');
                }
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message || '';
            if (msg.toLowerCase().includes('insufficient enquiry quota')) {
                setShowQuotaModal(true);
                loadQuotaData();
            } else {
                toast.error(msg || 'Error unlocking lead');
            }
        } finally {
            setUnlockingIds(prev => ({ ...prev, [`${dateKey}-${userId}`]: false }));
        }
    };

    const currentMeta = CLICK_TYPES[clickType] || CLICK_TYPES.whatsapp;
    const CurrentIcon = currentMeta.icon;

    return (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-0 pb-20 pt-6 space-y-6">
            {/* Promotional Growth Alert */}
            {mode === 'vendor' && walletBalance === 0 && (!subStatus || subStatus.length === 0) && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <FiCreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800 leading-tight">Boost your business!</p>
                            <p className="text-xs font-bold text-slate-600 mt-1">You have no active plan and ₹0 balance. Recharge or purchase a plan now to start receiving business enquiries.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/b2b-vendor/wallet')}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex-shrink-0"
                    >
                        Recharge Wallet
                    </button>
                </motion.div>
            )}

            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={() => {
                        if (mode === "admin") {
                            if (id && id !== 'undefined') {
                                navigate(`/admin/b2b-vendors/manage/${id}/dashboard`);
                            } else {
                                navigate("/admin/b2b-vendors/manage");
                            }
                        } else {
                            navigate("/b2b-vendor/dashboard");
                        }
                    }}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                >
                    <FiArrowLeft size={16} />
                    Back to Dashboard
                </button>
            </div>

            {/* Enquiry Stats Banner — vendor mode only */}
            {mode === 'vendor' && (
                <div className="space-y-3 mb-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Today's Enquiries</p>
                            <p className="text-3xl font-black text-slate-900">
                                {loadingStats ? '—' : (enquiryStats?.todayEnquiries ?? 0)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold">Unique users today</p>
                        </div>
                        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">This Month</p>
                            <p className="text-3xl font-black text-slate-900">
                                {loadingStats ? '—' : (enquiryStats?.monthlyEnquiries ?? 0)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold">Total unique enquiries</p>
                        </div>
                        <div className={`rounded-[2rem] p-5 shadow-sm border flex flex-col gap-1 ${
                            (enquiryStats?.effectiveQuota ?? 0) <= 0 && !(enquiryStats?.planEnquiryIsUnlimited)
                                ? 'bg-red-50 border-red-100'
                                : 'bg-purple-50 border-purple-100'
                        }`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Addon Quota Left</p>
                            <p className={`text-3xl font-black ${
                                (enquiryStats?.effectiveQuota ?? 0) <= 0 && !(enquiryStats?.planEnquiryIsUnlimited) ? 'text-red-600' : 'text-purple-700'
                            }`}>
                                {loadingStats ? '—' : enquiryStats?.planEnquiryIsUnlimited ? '∞' : (enquiryStats?.addonQuotaRemaining ?? 0)}
                            </p>
                            <p
                                onClick={() => (enquiryStats?.addonQuotaRemaining ?? 0) === 0 && !enquiryStats?.planEnquiryIsUnlimited && navigate('/b2b-vendor/subscription?feature=enquiry')}
                                className={`text-[9px] font-bold ${(enquiryStats?.addonQuotaRemaining ?? 0) === 0 && !enquiryStats?.planEnquiryIsUnlimited ? 'cursor-pointer hover:underline text-red-500' : 'text-slate-400'}`}
                            >
                                {enquiryStats?.planEnquiryIsUnlimited
                                    ? 'Unlimited by plan'
                                    : (enquiryStats?.addonQuotaRemaining ?? 0) === 0
                                        ? (enquiryStats?.walletBalance ?? 0) >= (enquiryStats?.enquiryPrice ?? 1)
                                            ? 'Auto-unlock via wallet active'
                                            : '⚠️ Low balance. Buy enquiry add-on'
                                        : 'Add-on units remaining'}
                            </p>
                        </div>
                    </div>

                    {/* Plan Enquiry Allowance Banner */}
                    <div className={`rounded-2xl px-5 py-3 border flex items-center justify-between gap-4 ${
                        enquiryStats?.planEnquiryIsUnlimited
                            ? 'bg-emerald-50 border-emerald-100'
                            : (enquiryStats?.planEnquiryLimit ?? 0) > 0
                                ? 'bg-blue-50 border-blue-100'
                                : 'bg-amber-50 border-amber-100'
                    }`}>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Plan Enquiry Allowance</p>
                            <p className={`text-lg font-black mt-0.5 ${
                                enquiryStats?.planEnquiryIsUnlimited ? 'text-emerald-700' :
                                (enquiryStats?.planEnquiryLimit ?? 0) > 0 ? 'text-blue-700' : 'text-amber-700'
                            }`}>
                                {loadingStats ? '—' :
                                    enquiryStats?.planEnquiryIsUnlimited ? 'Unlimited by Plan' :
                                    (enquiryStats?.planEnquiryLimit ?? 0) > 0 ? `${enquiryStats.planEnquiryLimit} per subscription cycle` :
                                    'Not included in current plan'
                                }
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Effective Total</p>
                            <p className="text-lg font-black text-slate-800">
                                {loadingStats ? '—' :
                                    enquiryStats?.planEnquiryIsUnlimited ? '∞' :
                                    enquiryStats?.effectiveQuota === -1 ? '∞' :
                                    (enquiryStats?.effectiveQuota ?? 0)
                                }
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold">Plan + Add-on + Wallet pool</p>
                        </div>
                    </div>
                </div>
            )}


            <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center`}>
                            <CurrentIcon className={currentMeta.color} size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">
                                {currentMeta.label}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Same user same date • shown once
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex flex-wrap rounded-xl sm:rounded-full bg-slate-100 p-1 gap-1">
                        {Object.entries(CLICK_TYPES).map(([key, meta]) => {
                            const ActiveIcon = meta.icon;
                            const isActive = clickType === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setClickType(key)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900"
                                        }`}
                                >
                                    <ActiveIcon size={12} />
                                    {key}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                            Loading visitors...
                        </div>
                    ) : error ? (
                        <div className="py-10 text-center">
                            <p className="text-xs font-black text-red-600 uppercase tracking-widest">{error}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                            No visitors found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((row, idx) => (
                                <div
                                    key={`${row?.dateKey || "date"}-${row?.user?._id || "user"}-${idx}`}

                                    className={`p-4 rounded-3xl border transition-all ${
                                        row.user?.isLocked 
                                        ? 'border-red-100 bg-red-50/30 hover:bg-red-50/50' 
                                        : 'border-slate-100 bg-slate-50/50 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                                                <FiUsers size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {row.dateKey} • {row.clickCount || 1} click
                                                    {(row.clickCount || 1) > 1 ? "s" : ""}
                                                </p>
                                                <p className="text-sm font-black text-slate-900 mt-1">
                                                    {row.user?.name || "Unknown User"}
                                                </p>
                                                <div className="mt-2 space-y-2">
                                                    {(row.category || row.user?.isLocked) && (
                                                        <div className="flex flex-wrap gap-2">
                                                        {row.category && (
                                                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-2 py-0.5 rounded-md inline-block">
                                                                {row.category}
                                                            </p>
                                                        )}
                                                        {row.user?.isLocked && (
                                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md inline-block border border-red-100 italic">
                                                                Locked Enquiry • Recharge to View
                                                            </p>
                                                        )}
                                                        </div>
                                                    )}
                                                    
                                                    {row.user?.isLocked ? (
                                                        <div className="pt-2">
                                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg inline-block">
                                                                Contact Hidden • Recharge to View
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            {row.user?.phone && (
                                                                <p className="text-xs font-bold text-slate-700">
                                                                    {row.user.phone}
                                                                </p>
                                                            )}
                                                            {row.user?.email && (
                                                                <p className="text-xs font-bold text-slate-500">
                                                                    {row.user.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Last
                                            </p>
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                                {row.lastClickAt
                                                    ? new Date(row.lastClickAt).toLocaleString("en-GB")
                                                    : "--"}
                                            </p>
                                            
                                            {row.user?.isLocked && (
                                                <button
                                                    onClick={() => handleUnlock(row)}
                                                    disabled={unlockingIds[`${row.dateKey}-${row.user?._id}`]}
                                                    className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                                                >
                                                    {unlockingIds[`${row.dateKey}-${row.user?._id}`] ? 'Unlocking...' : 'Unlock Lead (1 Credit)'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quota Recharge Modal */}
            <AnimatePresence>
                {showQuotaModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isPurchasing && setShowQuotaModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                                            <FiAlertCircle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Need More Enquiries?</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Your quota is exhausted</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowQuotaModal(false)}
                                        className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-slate-100">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                                        <p className="text-xl font-black text-slate-900">₹{walletBalance.toLocaleString('en-IN')}</p>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/b2b-vendor/wallet')}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-400 transition-all flex items-center gap-2"
                                    >
                                        <FiPlusCircle size={14} className="text-slate-900" />
                                        Add Money
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {enquiryPlans.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 text-xs font-bold">No enquiry packs available</p>
                                    ) : (
                                        enquiryPlans.map(plan => (
                                            <div 
                                                key={plan._id}
                                                className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary-200 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{plan.name}</p>
                                                        <p className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded inline-block mt-1">
                                                            {plan.credits} Enquiry Units
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-slate-900">₹{plan.price}</p>
                                                        <button 
                                                            disabled={isPurchasing}
                                                            onClick={async () => {
                                                                if (walletBalance < plan.price) {
                                                                    toast.error('Insufficient wallet balance');
                                                                    return;
                                                                }
                                                                setIsPurchasing(true);
                                                                try {
                                                                    await vendorWalletService.purchaseAddonViaWallet(plan._id);
                                                                    toast.success('Pack purchased successfully!');
                                                                    setShowQuotaModal(false);
                                                                    // Refresh page data
                                                                    const statsRes = await api.get('/vendor/analytics/enquiry-stats');
                                                                    if (statsRes?.success) setEnquiryStats(statsRes.data);
                                                                    loadQuotaData();
                                                                } catch (e) {
                                                                    toast.error(e.message || 'Purchase failed');
                                                                } finally {
                                                                    setIsPurchasing(false);
                                                                }
                                                            }}
                                                            className="mt-1 text-[9px] font-black text-white bg-slate-900 hover:bg-primary-600 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all disabled:opacity-50"
                                                        >
                                                            Buy Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                                    Units are deducted per user per day
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BVendorContactAnalytics;

