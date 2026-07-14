import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCreditCard, FiImage, FiPackage, FiGrid, FiDownload,
  FiSearch, FiFilter, FiTrendingUp, FiDollarSign,
  FiCalendar, FiMail, FiPhone, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiRefreshCw, FiX, FiEye, FiFileText
} from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TYPE_META = {
  subscription: { label: 'Subscription', icon: FiCreditCard, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  banner: { label: 'Banner', icon: FiImage, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  addon: { label: 'Add-on', icon: FiPackage, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
  recharge: { label: 'Wallet Topup', icon: FiTrendingUp, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const TransactionDetailModal = ({ txn, onClose }) => {
  useScrollLock(!!txn);
  if (!txn) return null;
  const meta = TYPE_META[txn.type] || TYPE_META.subscription;
  const Icon = meta.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className={`${meta.bg} p-7 flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center shadow-sm`}>
                <Icon className={`${meta.text} text-2xl`} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${meta.text} mb-0.5`}>{meta.label} Payment</p>
                <h3 className="text-lg font-black text-gray-900 leading-tight">{txn.label}</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/60 hover:bg-white rounded-xl transition-colors">
              <FiX className="text-gray-600 text-lg" />
            </button>
          </div>

          {/* Body */}
          <div className="p-7 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {/* Amount */}
            <div className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between">
              <span className="text-gray-500 font-bold text-sm">Total Amount Paid</span>
              <span className="text-3xl font-black text-gray-900">{formatCurrency(txn.amount)}</span>
            </div>

            {/* Breakdown */}
            {(txn.baseAmount || txn.gstAmount) && (
              <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Invoice Breakdown</p>
                {txn.type === 'subscription' && txn.unusedCredit > 0 ? (
                  <>
                    <div className="flex justify-between text-sm text-gray-600"><span>New Plan Price</span><span>{formatCurrency(Number(txn.baseAmount) + Number(txn.unusedCredit) + Number(txn.gstAmount))}</span></div>
                    <div className="flex justify-between text-sm text-emerald-600 font-bold"><span>Credit Applied (unused days)</span><span>- {formatCurrency(txn.unusedCredit)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Net Base (after credit)</span><span>{formatCurrency(txn.baseAmount)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>GST (18% on Net Base)</span><span>+ {formatCurrency(txn.gstAmount)}</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm text-gray-600"><span>Base Amount</span><span>{formatCurrency(txn.baseAmount)}</span></div>
                    {txn.gstAmount > 0 && <div className="flex justify-between text-sm text-gray-600"><span>GST (18%)</span><span>+ {formatCurrency(txn.gstAmount)}</span></div>}
                  </>
                )}
                <div className="flex justify-between font-black text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrency(txn.amount)}</span></div>
              </div>
            )}

            {/* Vendor */}
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Vendor</p>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="font-bold text-gray-900">{txn.vendorName}</p>
                {txn.vendorEmail && <div className="flex items-center gap-2 text-sm text-gray-500"><FiMail size={13} /><span>{txn.vendorEmail}</span></div>}
                {txn.vendorPhone && <div className="flex items-center gap-2 text-sm text-gray-500"><FiPhone size={13} /><span>{txn.vendorPhone}</span></div>}
                {txn.vendorGst && <div className="flex items-center gap-2 text-sm text-gray-500"><FiFileText size={13} /><span>GST: {txn.vendorGst}</span></div>}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Date</p>
                <p className="font-bold text-gray-700 text-sm">{formatDate(txn.date)}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Method</p>
                <p className="font-bold text-gray-700 text-sm capitalize">{txn.method}</p>
              </div>
              {txn.slotStart && (
                <div className="bg-gray-50 rounded-2xl p-4 col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Banner Slot</p>
                  <p className="font-bold text-gray-700 text-sm">{formatDate(txn.slotStart)} → {formatDate(txn.slotEnd)}</p>
                </div>
              )}
            </div>

            {/* Payment IDs */}
            {(txn.razorpayPaymentId || txn.razorpayOrderId) && (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Payment Reference</p>
                {txn.razorpayPaymentId && <p className="text-xs font-mono text-gray-500">Payment: {txn.razorpayPaymentId}</p>}
                {txn.razorpayOrderId && <p className="text-xs font-mono text-gray-500">Order: {txn.razorpayOrderId}</p>}
                {txn.zohoInvoiceId && <p className="text-xs font-mono text-gray-500">Zoho Invoice: {txn.zohoInvoiceId}</p>}
              </div>
            )}
          </div>

          {/* Footer with Action */}
          {txn.zohoInvoiceId && (
            <div className="p-7 border-t border-gray-50 flex-shrink-0">
              <button
                onClick={async () => {
                  try {
                    toast.loading('Downloading invoice...', { id: 'modal-inv' });
                    const url = `${api.defaults.baseURL}/admin/b2b-vendors/subscriptions/invoice/${txn.zohoInvoiceId}`;
                    const token = localStorage.getItem('admin-token'); // Corrected key from admin_token to admin-token

                    const response = await fetch(url, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Download failed');
                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.setAttribute('download', `invoice-${txn.zohoInvoiceId}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    toast.success('Invoice downloaded', { id: 'modal-inv' });
                  } catch (err) {
                    toast.error('Failed to download invoice', { id: 'modal-inv' });
                  }
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                <FiDownload size={18} />
                Download Official Invoice
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all', label: 'All Transactions', icon: FiGrid },
  { key: 'subscription', label: 'Subscriptions', icon: FiCreditCard },
  { key: 'banner', label: 'Banner Bookings', icon: FiImage },
  { key: 'addon', label: 'Add-on Plans', icon: FiPackage },
  { key: 'recharge', label: 'Wallet Recharges', icon: FiTrendingUp },
];

const AdminTransactions = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [revenue, setRevenue] = useState({ 
    subscription: { total: 0, count: 0 }, 
    banner: { total: 0, count: 0 }, 
    addon: { total: 0, count: 0 }, 
    wallet: { total: 0, count: 0 },
    grand: 0 
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [selectedBusinessType, setSelectedBusinessType] = useState('All Business Types');

  const LIMIT = 20;

  useEffect(() => {
    const loadBusinessTypes = async () => {
      try {
        const res = await api.get('/business-types');
        if (res.success) {
          setBusinessTypes(res.data || []);
        }
      } catch (error) {
        console.error('Error loading business types:', error);
      }
    };
    loadBusinessTypes();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/transactions?type=${activeTab}&page=${page}&limit=${LIMIT}&businessType=${selectedBusinessType}`);
      if (res.success) {
        setTransactions(res.data.transactions || []);
        setRevenue(res.data.revenueSummary || {});
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, selectedBusinessType]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [activeTab, selectedBusinessType]);

  const filtered = search.trim()
    ? transactions.filter(t =>
      t.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      t.vendorEmail?.toLowerCase().includes(search.toLowerCase()) ||
      t.label?.toLowerCase().includes(search.toLowerCase())
    )
    : transactions;

  return (
    <div className="space-y-8 p-4 lg:p-8 bg-gray-50/30 min-h-screen">
      {/* Revenue Summary Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: revenue.grand, icon: FiTrendingUp, color: 'emerald', sub: `${(revenue.subscription?.count || 0) + (revenue.banner?.count || 0) + (revenue.addon?.count || 0) + (revenue.wallet?.count || 0)} transactions` },
          { label: 'Subscriptions', value: revenue.subscription?.total || 0, icon: FiCreditCard, color: 'indigo', sub: `${revenue.subscription?.count || 0} plans sold` },
          { label: 'Banner Bookings', value: revenue.banner?.total || 0, icon: FiImage, color: 'amber', sub: `${revenue.banner?.count || 0} bookings` },
          { label: 'Add-on Packs', value: revenue.addon?.total || 0, icon: FiPackage, color: 'rose', sub: `${revenue.addon?.count || 0} packs sold` },
          { label: 'Wallet Topups', value: revenue.wallet?.total || 0, icon: FiDollarSign, color: 'emerald', sub: `${revenue.wallet?.count || 0} recharges` },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={i} whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <div className={`w-11 h-11 rounded-2xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center text-xl mb-4`}>
                <Icon />
              </div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(card.value)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-50 rounded-2xl p-1 flex-wrap">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}>
                  <Icon size={14} />
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                    {tab.key === 'all' ? total :
                      tab.key === 'subscription' ? (revenue.subscription?.count || 0) :
                        tab.key === 'banner' ? (revenue.banner?.count || 0) :
                          tab.key === 'addon' ? (revenue.addon?.count || 0) :
                            (revenue.wallet?.count || 0)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* Business Type Filter */}
            <select
              className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-sm font-bold text-gray-700 outline-none w-full sm:w-48"
              value={selectedBusinessType}
              onChange={(e) => setSelectedBusinessType(e.target.value)}
            >
              <option value="All Business Types">All Business Types</option>
              {businessTypes.map(type => (
                <option key={type._id} value={type.name}>{type.name}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor, plan..."
                className="pl-10 pr-4 py-2.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FiX size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiDollarSign className="text-gray-300 text-3xl" />
            </div>
            <p className="text-gray-500 font-bold">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Method</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((txn, idx) => {
                const meta = TYPE_META[txn.type] || TYPE_META.subscription;
                const Icon = meta.icon;
                return (
                  <motion.tr key={txn._id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gray-50/60 transition-colors group">

                    {/* Vendor */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{txn.vendorName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{txn.vendorEmail}</p>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4 max-w-[180px]">
                      <p className="text-sm font-semibold text-gray-700 truncate">{txn.label}</p>
                      {txn.isUpgrade && (
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Upgrade · credit applied
                        </span>
                      )}
                      {txn.slotStart && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(txn.slotStart)} → {formatDate(txn.slotEnd)}
                        </p>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${meta.bg} ${meta.text}`}>
                        <Icon size={11} />
                        {meta.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center gap-1.5 justify-center text-sm text-gray-500 font-medium">
                        <FiCalendar size={12} className="text-gray-400" />
                        {formatDate(txn.date)}
                      </div>
                    </td>

                    {/* Method */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-gray-500 capitalize">{txn.method}</span>
                    </td>

                    {/* Status — always completed (payment was made) */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">
                        <FiCheckCircle size={11} />
                        Paid
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-black text-gray-900">{formatCurrency(txn.amount)}</span>
                      {txn.zohoInvoiceId && (
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <FiFileText size={10} className="text-indigo-400" />
                          <span className="text-[9px] text-indigo-400 font-bold">Invoice ✓</span>
                        </div>
                      )}
                    </td>

                    {/* View Button */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="p-2 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-indigo-500 transition-all">
                        <FiEye size={16} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-5 border-t border-gray-50">
          <p className="text-sm text-gray-400 font-medium">
            Showing page {page} of {totalPages} — {total} total records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-all">
              <FiChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = page <= 3 ? i + 1 : page + i - 2;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <button key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${pageNum === page
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                    }`}>
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-all">
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
 
      {/* Detail Modal */ }
  {
    selectedTxn && (
      <TransactionDetailModal txn={selectedTxn} onClose={() => setSelectedTxn(null)} />
    )
  }
    </div >
  );
};

export default AdminTransactions;
