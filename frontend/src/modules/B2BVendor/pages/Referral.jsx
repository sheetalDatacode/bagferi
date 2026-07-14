import { FiCopy, FiShare2, FiUsers, FiAward, FiGift, FiInfo } from "react-icons/fi";
import { handleShare } from "../../../shared/utils/share";
import { motion } from "framer-motion";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMyReferralSummary } from "../../../shared/services/referralService";
import api from "../../../shared/utils/api";

const B2BVendorReferral = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [referralData, setReferralData] = useState(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState("");

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
        if (!referralData?.referralCode) return;
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
        if (!referralData?.referralCode) return;
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

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
            <div className="flex justify-end">
                <div className="flex items-center gap-4 bg-primary-50 p-4 rounded-2xl border border-primary-100">
                     <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <FiGift className="text-2xl" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Total Earned</p>
                        <p className="text-xl font-black text-gray-900">₹{(referralData?.wallet?.pointsBalance || 0).toLocaleString('en-IN')}</p>
                     </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <FiUsers className="text-2xl" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{referralData?.referralCount || 0}</p>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Referrals</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
                        <FiAward className="text-2xl" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{referralData?.milestoneUnlocked ? "Unlocked" : "Locked"}</p>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Premium Rewards</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <FiGift className="text-2xl" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">Active</p>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Campaign Status</p>
                </div>
            </div>

            {/* Referral Link & Code */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                             Share Your Link
                        </h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Share this link with other vendors. When they sign up using your link, they'll be added to your network and you'll earn rewards based on their activity.
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Your Unique Referral Link</label>
                                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 p-1 rounded-xl">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={referralData?.referralLink || "Loading link..."} 
                                        className="bg-transparent border-none text-sm font-medium px-3 flex-1 focus:ring-0 truncate"
                                    />
                                    <button 
                                        onClick={copyReferralLink}
                                        className="p-3 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors shadow-lg"
                                    >
                                        <FiCopy />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 pt-2">
                                <button
                                    onClick={handleShareReferral}
                                    disabled={!referralData?.referralCode}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiShare2 className="text-lg" /> Share Now
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-6">
                             <div className="p-3 bg-primary-600/20 text-primary-400 rounded-xl">
                                <FiInfo className="text-xl" />
                             </div>
                             <div>
                                <h4 className="font-bold text-white mb-1">How it works</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">Referrals are tracked automatically. Once your referred vendors complete their verification, referral rewards are credited directly to your wallet as spendable balance.</p>
                             </div>
                        </div>
                        
                        <div className="space-y-4">
                             <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Referral Code</p>
                                 <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl text-center">
                                     <span className="text-2xl font-black text-primary-500 tracking-widest break-words whitespace-normal">{referralData?.referralCode || "----"}</span>
                                 </div>
                             </div>
                             
                             {!referralData?.milestoneUnlocked && (
                                <div className="mt-4">
                                     <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-slate-400">Progress to Reward</span>
                                        <span className="text-primary-500">{referralData?.referralCount || 0} / {referralData?.milestoneThreshold || 10}</span>
                                     </div>
                                     <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(((referralData?.referralCount || 0) / (referralData?.milestoneThreshold || 10)) * 100, 100)}%` }}
                                            className="h-full bg-primary-600"
                                        />
                                     </div>
                                     <p className="text-[10px] text-slate-500 mt-2 italic text-center">
                                        Refer {Math.max((referralData?.milestoneThreshold || 10) - (referralData?.referralCount || 0), 0)} more to unlock premium perks.
                                     </p>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* History Section */}
            {referralData?.history?.length > 0 && (
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FiUsers className="text-primary-600" /> Recent Referrals
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-gray-100">
                                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">User</th>
                                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Status</th>
                                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {referralData.history.map((item, index) => (
                                    <tr key={item._id || index} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                                                    {item.referredUserName?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{item.referredUserName || "Anonymous"}</p>
                                                    <p className="text-[10px] text-gray-400">{item.referredUserEmail || "No email"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 text-xs text-gray-500">
                                            {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {referralError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
                    <FiInfo className="shrink-0" />
                    <p className="text-sm font-bold">{referralError}. Please try refreshing the page.</p>
                </div>
            )}
        </motion.div>
    );
};

export default B2BVendorReferral;
