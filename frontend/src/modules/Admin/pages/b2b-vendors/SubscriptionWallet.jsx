import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiSearch,
    FiArrowDownLeft,
    FiCreditCard,
    FiClock,
    FiDownload,
    FiCalendar,
    FiInfo,
    FiCheckCircle,
    FiShoppingBag,
    FiActivity,
    FiTrendingUp
} from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import api from "../../../../shared/utils/api";

const SubscriptionWallet = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        active: 0,
        monthlyRevenue: 0,
        expiringSoon: 0,
        totalCollectedRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [searchTerm]);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/b2b-vendors/subscriptions');
            if (response.success) {
                setStats(response.stats || {});
                // Filter transactions based on search term
                const allSubs = response.data || [];
                const filtered = allSubs.filter(sub =>
                    sub.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sub.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sub.plan?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setTransactions(filtered);
            }
        } catch (error) {
            console.error("Error loading Subscription wallet data:", error);
            toast.error(error?.response?.data?.message || "Failed to load subscription wallet data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <FiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <h1 className="lg:hidden text-2xl font-black text-gray-900 uppercase">Subscription Wallet</h1>
                        <p className="text-gray-500 text-sm font-medium">Manage and monitor B2B subscription payments</p>
                    </div>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500 text-purple-600">
                        <FiShoppingBag size={120} />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Subscription Revenue</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900">
                            {loading ? (
                                <span className="text-gray-300">Loading...</span>
                            ) : (
                                formatPrice(stats.totalCollectedRevenue || 0)
                            )}
                        </span>
                        <span className="text-sm font-bold text-purple-600">INR</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                        <FiTrendingUp className="text-sm" />
                        <span className="text-xs font-bold">Lifetime Collection</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly Equivalent (MRR)</p>
                    <p className="text-4xl font-black text-gray-900">
                        {loading ? (
                            <span className="text-gray-300">...</span>
                        ) : (
                            formatPrice(stats.monthlyRevenue || 0)
                        )}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
                        <FiActivity className="text-sm" />
                        <span className="text-xs font-bold">Recurring Revenue</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Subscriptions</p>
                    <p className="text-4xl font-black text-gray-900">
                        {loading ? (
                            <span className="text-gray-300">...</span>
                        ) : (
                            stats.active || 0
                        )}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                        <FiCheckCircle className="text-sm" />
                        <span className="text-xs font-bold">Currently Active</span>
                    </div>
                </motion.div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Payment Logs</h3>
                        <p className="text-sm text-gray-500 font-medium">Every rupee from B2B subscriptions tracked here</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-96">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Payment ID, Vendor or Plan..."
                                className="pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm w-full focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subscriber Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Subscription Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Payment Info</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                            <p className="text-sm font-bold text-gray-500">Syncing subscription wallet...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {transactions.map((txn, index) => (
                                        <motion.tr
                                            key={txn._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50/50 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                                                        <FiShoppingBag className="text-lg" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{txn.vendorName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{txn.paymentId}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                                <FiCalendar /> {new Date(txn.lastPaymentDate || txn.startDate).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${txn.plan?.toLowerCase().includes('premium') ? 'bg-purple-100 text-purple-700' :
                                                        txn.plan?.toLowerCase().includes('diamond') ? 'bg-blue-100 text-blue-700' :
                                                            txn.plan?.toLowerCase().includes('silver') ? 'bg-gray-100 text-gray-700' :
                                                                'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {txn.plan}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{txn.billingCycle}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge variant={txn.status === 'active' ? 'success' : txn.status === 'expired' ? 'error' : 'warning'}>
                                                        {txn.status?.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        {txn.paymentMethod?.toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <p className="text-lg font-black text-green-600">
                                                        +{formatPrice(txn.amount)}
                                                    </p>
                                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">SUCCESSFUL</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {!loading && transactions.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-20">
                                                    <FiInfo size={48} />
                                                    <p className="text-lg font-black text-gray-900 uppercase tracking-widest">No Payment logs Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer info */}
                <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">End of Subscription Wallet Statement</p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionWallet;
