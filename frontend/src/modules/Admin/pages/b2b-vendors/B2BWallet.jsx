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
import { getAdminPayoutRequests, updatePayoutRequestStatus } from "../../services/walletAdminService";
import { FiCheck, FiX, FiCheckSquare, FiAlertCircle, FiSend } from "react-icons/fi";

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

  // New Payout States
  const [activeTab, setActiveTab] = useState("settlements"); // "settlements" | "banners"
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [adminStats, setAdminStats] = useState({
    totalAdvancesReceived: 0,
    totalPendingPayouts: 0,
    totalClearedPayouts: 0
  });
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
    loadPayoutData();
  }, [searchTerm]);

  const loadPayoutData = async () => {
    setPayoutLoading(true);
    try {
      const res = await getAdminPayoutRequests();
      setPayoutRequests(res.requests || []);
      setAdminStats(res.stats || {
        totalAdvancesReceived: 0,
        totalPendingPayouts: 0,
        totalClearedPayouts: 0
      });
    } catch (error) {
      console.error("Error loading payouts:", error);
      toast.error("Failed to load payout requests");
    } finally {
      setPayoutLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, transactionsRes] = await Promise.all([
        getBannerRevenueStats({ params: { bannerType: 'b2b' } }),
        getBannerTransactions({ search: searchTerm, limit: 100, bannerType: 'b2b' })
      ]);

      setRevenueStats(statsRes?.data || statsRes || {});
      setTransactions(transactionsRes?.data || []);
    } catch (error) {
      console.error("Error loading B2B wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (status) => {
    if (!selectedRequest) return;
    if (status === 'Approved' && !utrNumber.trim()) {
      return toast.error("Please enter bank UTR / reference number");
    }

    setProcessing(true);
    try {
      await updatePayoutRequestStatus(selectedRequest._id, status, utrNumber);
      toast.success(`Payout successfully ${status === 'Approved' ? 'approved' : 'rejected'}`);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setUtrNumber("");
      loadPayoutData();
    } catch (error) {
      toast.error(error.message || "Failed to update payout request");
    } finally {
      setProcessing(false);
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
            <h1 className="lg:hidden text-2xl font-black text-gray-900">B2B Financial Ledger</h1>
            <p className="text-gray-500 text-sm font-medium">Manage and track all B2B Banner and Advance payments</p>
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
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Advances Received</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 font-sans">
              {payoutLoading ? (
                <span className="text-gray-300">Loading...</span>
              ) : (
                formatPrice(adminStats.totalAdvancesReceived || 0)
              )}
            </span>
            <span className="text-sm font-bold text-blue-600">INR</span>
          </div>
          <div className="mt-6 flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit">
            <FiCheckCircle className="text-sm" />
            <span className="text-xs font-bold">Total Customer Paid (Razorpay)</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pending Vendor Payouts</p>
          <p className="text-4xl font-black text-gray-900">
            {payoutLoading ? (
              <span className="text-gray-300">...</span>
            ) : (
              formatPrice(adminStats.totalPendingPayouts || 0)
            )}
          </p>
          <div className="mt-6 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
            <FiClock className="text-sm" />
            <span className="text-xs font-bold">Owed to B2B Vendors</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cleared Vendor Payouts</p>
          <p className="text-4xl font-black text-gray-900">
            {payoutLoading ? (
              <span className="text-gray-300">...</span>
            ) : (
              formatPrice(adminStats.totalClearedPayouts || 0)
            )}
          </p>
          <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
            <FiCheckCircle className="text-sm" />
            <span className="text-xs font-bold">Settled & Completed</span>
          </div>
        </motion.div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit mb-8">
        <button 
          onClick={() => setActiveTab('settlements')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settlements' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Payout Settlements
          {payoutRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black">
              {payoutRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('advances')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'advances' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          B2B Advance Payments
        </button>
        <button 
          onClick={() => setActiveTab('banners')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'banners' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          B2B Banner Bookings
        </button>
      </div>

      {/* Render Dynamic View based on activeTab */}
      {activeTab === 'settlements' ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Vendor Settlement Requests</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Review, approve or reject payout requests</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">B2B Vendor</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Settlement Cycle</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Requested Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payoutLoading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        <p className="text-xs font-bold text-gray-500">Loading payout requests...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {payoutRequests.map((req, idx) => (
                      <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div>
                            <p className="font-black text-gray-900 text-sm">{req.vendorId?.storeName || req.vendorId?.name || "Vendor"}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">Email: {req.vendorId?.email} | Mobile: {req.vendorId?.phone}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-gray-700">
                            {req.month} (Week {req.period})
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Pending' ? 'warning' : 'danger'}>
                            {req.status}
                          </Badge>
                          {req.referenceNumber && (
                            <p className="text-[9px] text-gray-400 font-mono mt-1">UTR: {req.referenceNumber}</p>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-base font-black text-gray-900">₹{req.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowApprovalModal(true);
                                }}
                                className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                              >
                                <FiCheck /> Pay / Clear
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm("Are you sure you want to reject this request?")) {
                                    try {
                                      await updatePayoutRequestStatus(req._id, 'Rejected');
                                      toast.success("Payout request rejected");
                                      loadPayoutData();
                                    } catch (err) {
                                      toast.error("Failed to reject payout");
                                    }
                                  }
                                }}
                                className="flex items-center gap-1 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold"
                              >
                                <FiX /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payoutRequests.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-8 py-20 text-center text-gray-400 italic text-sm">
                          No payout settlement requests found
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h3 className="text-xl font-black text-gray-900">
                {activeTab === 'advances' ? 'B2B Advance Payments History' : 'B2B Banner Bookings History'}
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                {activeTab === 'advances' ? 'Detailed logs of customer-paid B2B advance deposits' : 'Detailed logs of vendor banner space purchases'}
              </p>
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
                  (() => {
                    const filteredTxns = transactions.filter(txn => 
                      activeTab === 'advances' ? txn.type === 'advance' : txn.type !== 'advance'
                    );

                    if (filteredTxns.length === 0) {
                      return (
                        <tr>
                          <td colSpan="4" className="px-8 py-20 text-center text-gray-400 italic text-sm">
                            No matching financial records found
                          </td>
                        </tr>
                      );
                    }

                    return filteredTxns.map((txn, index) => (
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
                              <p className="font-black text-gray-900 text-sm">
                                {txn.type === 'advance' ? 'B2B Advance Payment' : 'B2B Banner Booking Payment'}
                              </p>
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
                            {txn.bookingId && txn.type !== 'advance' && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">ID: {txn.bookingId}</span>
                            )}
                            {txn.type === 'advance' && (
                              <span className="text-[9px] font-bold text-purple-500 uppercase tracking-tighter">Order ID: {txn.bookingId}</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">End of B2B statement for current period</p>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">Process Vendor Payout</h3>
            <p className="text-xs text-gray-500 font-medium mb-6">
              Owed to <strong className="text-gray-900">{selectedRequest.vendorId?.storeName}</strong>: <strong className="text-emerald-600">₹{selectedRequest.amount.toLocaleString('en-IN')}</strong> for cycle {selectedRequest.month} ({selectedRequest.period}).
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Bank Transaction UTR / Ref Number *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1234567890"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => handleProcessPayout('Approved')}
                  disabled={processing}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 flex items-center justify-center gap-1.5 transition-all disabled:opacity-75"
                >
                  {processing ? "Clearing..." : <><FiSend /> Approve & Settle</>}
                </button>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setUtrNumber("");
                  }}
                  disabled={processing}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BWallet;
