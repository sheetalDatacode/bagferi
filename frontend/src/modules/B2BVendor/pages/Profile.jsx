import { FiMapPin, FiPhone, FiMail, FiEdit2, FiCheckCircle, FiCopy, FiShare2, FiShield, FiArrowRight, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMyReferralSummary } from "../../../shared/services/referralService";
import { useNavigate } from "react-router-dom";
import { handleShare } from "../../../shared/utils/share";
import api from "../../../shared/utils/api";
import { useScrollLock } from "../../../shared/hooks/useScrollLock";

const B2BVendorProfile = () => {
    const { vendor } = useB2BVendorAuthStore();
    const navigate = useNavigate();
    const [referralData, setReferralData] = useState(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useScrollLock(showDeleteModal);

    useEffect(() => {
        const loadReferral = async () => {
            setReferralLoading(true);
            setReferralError("");
            try {
                const data = await getMyReferralSummary();
                setReferralData(data);
            } catch (error) {
                console.error("Failed to load vendor referral summary:", error);
                setReferralError(error?.response?.data?.message || error?.message || "Unable to load referral details");
            } finally {
                setReferralLoading(false);
            }
        };

        if (vendor?._id) {
            loadReferral();
        }
    }, [vendor?._id]);

    const handleShareReferral = async () => {
        if (!referralData?.referralLink) return;
        // Derive the backend OG share URL for rich WhatsApp/social preview
        const apiBase = api.defaults.baseURL || '';
        const backendBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase.replace(/\/api\/?$/, '');
        const shareUrl = `${backendBase}/api/referrals/share/${referralData.referralCode}`;
        await handleShare({
            title: "Join Dealing India - B2B Marketplace",
            text: `Join Dealing India using my referral code: ${referralData.referralCode}\nDownload App: https://play.google.com/store/apps/details?id=com.dealingindia.app`,
            url: shareUrl,
        });
    };

    const copyReferralLink = async () => {
        if (!referralData?.referralLink) return;
        try {
            // Copy the backend OG share URL — pasting it in WhatsApp shows the rich preview
            const apiBase = api.defaults.baseURL || '';
            const backendBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase.replace(/\/api\/?$/, '');
            const shareUrl = `${backendBase}/api/referrals/share/${referralData.referralCode}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Referral link copied");
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const confirmDeleteAccount = async () => {
        try {
            setIsDeleting(true);
            const res = await api.delete('/auth/vendor/delete-account');
            if (res.success) {
                toast.success('Account deleted successfully');
                useB2BVendorAuthStore.getState().logout();
                navigate('/b2b/login');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete account');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Cover/Header Section */}
            <div className="relative h-48 md:h-64 bg-slate-200 rounded-3xl shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-900/40 rounded-3xl" />
                <div className="absolute bottom-4 md:bottom-8 left-4 md:left-10 flex items-center gap-4 md:gap-6 w-[calc(100%-2rem)] md:w-[calc(100%-5rem)]">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-2 shadow-xl border-4 border-white overflow-hidden shrink-0 z-10">
                        {vendor?.storeLogo ? (
                            <img src={vendor.storeLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl md:text-4xl font-black text-primary-600">{vendor?.name?.charAt(0) || "V"}</span>
                            </div>
                        )}
                    </div>
                    <div className="z-10 flex flex-col justify-center flex-1 min-w-0">
                        <h1 className="text-xl md:text-3xl font-black text-white flex items-center gap-2 drop-shadow-md">
                            <span className="truncate">{vendor?.storeName || vendor?.companyName || vendor?.name}</span>
                            <div className="flex items-center justify-center shrink-0 mt-0.5 md:mt-1">
                                <FiCheckCircle className="text-white fill-green-500 text-lg md:text-2xl" />
                            </div>
                        </h1>
                        <p className="text-white/90 text-sm md:text-base font-medium drop-shadow-sm mt-0.5 md:mt-1">Verified B2B Vendor</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate("/b2b-vendor/settings/profile")}
                    className="absolute top-4 right-4 md:top-auto md:bottom-10 md:right-10 flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white text-gray-800 text-sm md:text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all z-10"
                >
                    <FiEdit2 /> <span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                </button>
            </div>

            <div className="pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Contact Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMail /></div>
                                <span className="text-sm font-medium break-all">{vendor?.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiPhone /></div>
                                <span className="text-sm font-medium">{vendor?.phone}</span>
                            </div>
                            {vendor?.address && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMapPin /></div>
                                    <span className="text-sm font-medium">
                                        {vendor.address.city}, {vendor.address.state}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Business Identity</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Business Type</p>
                                <p className="font-bold text-gray-800">{vendor?.businessType || 'N/A'}</p>
                            </div>
                            
                            {vendor?.gstNumber && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GST Number</p>
                                    <p className="font-mono font-bold text-gray-800 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                                        {vendor.gstNumber}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">About Us</h3>
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line">
                            {vendor?.storeDescription || "No description provided."}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Business Compliance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Verification Status</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base capitalize">{vendor?.status || 'Pending'}</p>
                                </div>
                                <FiCheckCircle className={`text-xl ${vendor?.status === 'Active' ? 'text-green-500' : 'text-amber-500'}`} />
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vendor Plan</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base">
                                        {vendor?.currentSubscription ? "Active Subscription" : "Standard"}
                                    </p>
                                </div>
                                <FiCheckCircle className="text-blue-500 text-xl" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Legal & Policies</h3>
                        <button 
                            onClick={() => navigate('/terms?type=vendor')}
                            className="w-full p-4 border border-gray-100 rounded-xl flex items-center justify-between group hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-primary-600 transition-colors">
                                    <FiShield size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-700 text-sm md:text-base">Terms & Conditions</p>
                                    <p className="text-[10px] font-medium text-gray-400">Review platform legal and operational guidelines</p>
                                </div>
                            </div>
                            <FiArrowRight className="text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                        </button>
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full mt-4 p-4 border border-red-100 rounded-xl flex items-center justify-between group hover:border-red-200 hover:bg-red-50/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                                    <FiX size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-red-600 text-sm md:text-base">Delete Account</p>
                                    <p className="text-[10px] font-medium text-red-400">Permanently remove your vendor account</p>
                                </div>
                            </div>
                            <FiArrowRight className="text-red-300 group-hover:text-red-500 transition-all group-hover:translate-x-1" />
                        </button>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 md:p-6 text-white shadow-sm">
                        <h3 className="text-lg font-bold mb-2">Referral Program</h3>
                        <p className="text-sm font-semibold">Code: {referralData?.referralCode || "Not available"}</p>
                        <p className="text-sm text-emerald-100 mt-1">Referrals: {referralData?.referralCount || 0} | Wallet Points: {referralData?.wallet?.pointsBalance || 0}</p>
                        {referralLoading && <p className="text-xs text-emerald-100 mt-2">Loading referral details...</p>}
                        {referralError && (
                            <p className="text-xs text-amber-100 mt-2">
                                {referralError}. Restart backend and refresh this page.
                            </p>
                        )}
                        {!referralData?.milestoneUnlocked && !referralLoading && (
                            <p className="text-xs text-emerald-100 mt-2">
                                Refer {Math.max((referralData?.milestoneThreshold || 10) - (referralData?.referralCount || 0), 0)} more users to unlock higher rewards.
                            </p>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={copyReferralLink}
                                disabled={!referralData?.referralLink}
                                className="px-3 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiCopy /> Copy Link
                            </button>
                            <button
                                onClick={handleShareReferral}
                                disabled={!referralData?.referralLink}
                                className="px-3 py-2 rounded-xl bg-emerald-900/30 text-white text-xs font-bold flex items-center gap-2 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiShare2 /> Share
                            </button>
                        </div>
                    </div>

                    {vendor?.address && (
                        <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Location</h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="font-bold text-gray-800 mb-1 uppercase tracking-tight">
                                    {[vendor.address.street, vendor.address.market, vendor.address.landmark].filter(Boolean).join(', ')}
                                </p>
                                <p className="text-gray-600 text-sm uppercase">
                                    {[vendor.address.area, vendor.address.city, vendor.address.state].filter(Boolean).join(', ')}
                                    {vendor.address.country && ` (${vendor.address.country})`}
                                    {vendor.address.pincode && ` - ${vendor.address.pincode}`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                                    <FiX className="text-red-500 text-3xl" />
                                </div>
                                
                                <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                                    Delete Account?
                                </h3>
                                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                                    Are you sure you want to permanently delete your account? This action cannot be undone and you will lose all your data.
                                </p>
                                
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmDeleteAccount}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default B2BVendorProfile;
