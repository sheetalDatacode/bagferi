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
  FiCheckCircle
} from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import { getBannerRevenueStats, getBannerTransactions } from "../../services/heroBannerService";

const B2BWallet = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    percentageChange: 0,
    activeBookingsCount: 0,
    activeBookingsLast30Days: 0,
    uniqueVendorsCount: 0,
    totalPaidBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, transactionsRes] = await Promise.all([
        getBannerRevenueStats({ params: { bannerType: 'b2b' } }),
        getBannerTransactions({ search: searchTerm, limit: 100, bannerType: 'b2b' })
      ]);

      // Handle response structure (API interceptor returns response.data directly)
      // Backend returns: { success: true, data: {...} }
      // Interceptor returns: { success: true, data: {...} }
      setRevenueStats(statsRes?.data || statsRes || {});
      setTransactions(transactionsRes?.data || []);
    } catch (error) {
      console.error("Error loading B2B wallet data:", error);
      toast.error(error?.response?.data?.message || "Failed to load B2B wallet data");
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
            <h1 className="lg:hidden text-2xl font-black text-gray-900">B2B Banner Payments</h1>
            <p className="text-gray-500 text-sm font-medium">Manage and track all B2B Banner booking transactions</p>
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
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <FiCreditCard size={120} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total B2B Banner Revenue</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900">
              {loading ? (
                <span className="text-gray-300">Loading...</span>
              ) : (
                formatPrice(revenueStats.totalCollections || 0)
              )}
            </span>
            <span className="text-sm font-bold text-blue-600">INR</span>
          </div>
          {revenueStats.percentageChange !== undefined && (
            <div className={`mt-6 flex items-center gap-2 ${revenueStats.percentageChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-3 py-1 rounded-full w-fit`}>
              <FiArrowDownLeft className="text-sm" />
              <span className="text-xs font-bold">
                {revenueStats.percentageChange >= 0 ? '+' : ''}{revenueStats.percentageChange.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active Bookings (30d)</p>
          <p className="text-4xl font-black text-gray-900">
            {loading ? (
              <span className="text-gray-300">...</span>
            ) : (
              revenueStats.activeBookingsLast30Days || 0
            )}
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(3, revenueStats.uniqueVendorsCount || 0) }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold">V{i + 1}</div>
              ))}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              from {revenueStats.uniqueVendorsCount || 0} {revenueStats.uniqueVendorsCount === 1 ? 'B2B vendor' : 'B2B vendors'}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Paid Bookings</p>
          <p className="text-4xl font-black text-gray-900">
            {loading ? (
              <span className="text-gray-300">...</span>
            ) : (
              revenueStats.totalPaidBookings || transactions.length || 0
            )}
          </p>
          <div className="mt-6 flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
            <FiCheckCircle className="text-sm" />
            <span className="text-xs font-bold">All payments verified</span>
          </div>
        </motion.div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h3 className="text-xl font-black text-gray-900">B2B Transaction History</h3>
            <p className="text-sm text-gray-500 font-medium">Detailed logs of all B2B banner financial movements</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-96">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, Vendor or Reference..."
                className="pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm w-full focus:ring-2 focus:ring-gray-900 transition-all outline-none"
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
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">B2B Vendor / Entity</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Payment Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                      <p className="text-sm font-bold text-gray-500">Loading B2B transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {transactions.map((txn, index) => (
                    <motion.tr
                      key={txn.id || txn.transactionId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-green-50 text-green-600 group-hover:scale-110 transition-transform duration-300">
                            <FiArrowDownLeft className="text-lg" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">B2B Banner Booking Payment</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{txn.id}</span>
                              <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                <FiCalendar /> {new Date(txn.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold uppercase">
                            {txn.vendor?.charAt(0) || 'V'}
                          </div>
                          <span className="text-xs font-bold text-gray-700">{txn.vendor || 'Unknown B2B Vendor'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="success">
                            {txn.status?.toUpperCase() || 'PAID'}
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {txn.method?.toUpperCase() || 'RAZORPAY'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-lg font-black text-green-600">
                            +{formatPrice(txn.amount)}
                          </p>
                          {txn.bookingId && (
                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">ID: {txn.bookingId}</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {!loading && transactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <FiInfo size={48} />
                          <p className="text-lg font-black text-gray-900 uppercase tracking-widest">No B2B Records Found</p>
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
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">End of B2B statement for current period</p>
        </div>
      </div>
    </div>
  );
};

export default B2BWallet;
