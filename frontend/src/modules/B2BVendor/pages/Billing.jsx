import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiCreditCard, FiDownload, FiInfo, FiRefreshCw, 
    FiPackage, FiPlusCircle, FiGrid, FiClock, FiImage,
    FiCheckCircle, FiXCircle, FiArrowRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import subscriptionService from '../services/subscriptionService';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const Billing = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [billingHistory, setBillingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            setLoading(true);
            const history = await subscriptionService.getBillingHistory();
            setBillingHistory(history);
        } catch (err) {
            console.error('Error loading billing data:', err);
            toast.error('Failed to load billing history');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async (invoiceId) => {
        if (!invoiceId) {
            toast.error('Invoice not available yet');
            return;
        }

        try {
            setDownloadingId(invoiceId);
            toast.loading('Downloading invoice...', { id: 'download-invoice' });
            await subscriptionService.downloadInvoice(invoiceId);
            toast.success('Invoice downloaded successfully!', { id: 'download-invoice' });
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download invoice', { id: 'download-invoice' });
        } finally {
            setDownloadingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return { day: '', month: '', year: '' };
        const d = new Date(dateString);
        return {
            day: d.getDate(),
            month: d.toLocaleDateString('en-IN', { month: 'short' }),
            year: d.getFullYear()
        };
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading billing information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10 flex justify-end">
                <button
                    onClick={loadBillingData}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl hover:border-primary-200 hover:bg-primary-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 group font-bold text-gray-600"
                >
                    <FiRefreshCw className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    Refresh Data
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center">
                            <FiCreditCard size={24} />
                        </div>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total Transactions</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{billingHistory.length}</p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <FiCheckCircle size={24} />
                        </div>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Active Plan</p>
                    </div>
                    <p className="text-xl font-black text-gray-900 truncate">
                        {billingHistory.find(h => h.type === 'subscription_payment' && h.status === 'completed')?.planName || 'No Active Plan'}
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <FiPackage size={24} />
                        </div>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Last Transaction</p>
                    </div>
                    <p className="text-xl font-black text-gray-900">
                        {billingHistory[0] ? (() => {
                            const d = formatDate(billingHistory[0].date);
                            return `${d.day} ${d.month} ${d.year}`;
                        })() : 'N/A'}
                    </p>
                </motion.div>
            </div>

            {/* Billing History Table */}
            <div className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200 shrink-0">
                            <FiClock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Transaction History</h3>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Your recent payments and invoices</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                    {billingHistory.length > 0 ? (
                        <div>
                            {/* Desktop Table */}
                            <div className="hidden lg:block">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-8 py-5">Description</th>
                                            <th className="px-8 py-5 text-center">Date</th>
                                            <th className="px-8 py-5 text-center">Status</th>
                                            <th className="px-8 py-5 text-center">Amount</th>
                                            <th className="px-8 py-5 text-right whitespace-nowrap">Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {billingHistory.map((item, idx) => {
                                            const dateObj = formatDate(item.date);
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110 ${
                                                                item.type === 'subscription_payment' 
                                                                    ? 'bg-primary-100 text-primary-600' 
                                                                    : item.type === 'banner_booking'
                                                                    ? 'bg-amber-100 text-amber-600'
                                                                    : item.type === 'wallet_recharge'
                                                                    ? 'bg-emerald-100 text-emerald-600'
                                                                    : 'bg-indigo-100 text-indigo-600'
                                                            }`}>
                                                                {item.type === 'subscription_payment' ? <FiPackage /> : item.type === 'banner_booking' ? <FiImage /> : item.type === 'wallet_recharge' ? <FiCreditCard /> : <FiPlusCircle />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900 text-sm leading-tight">{item.planName}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Ref: {item.transactionCode}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="text-sm font-bold text-gray-500 tabular-nums">{dateObj.day} {dateObj.month} {dateObj.year}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex justify-center">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                                                item.status === 'completed' || item.status === 'active' ? 'bg-emerald-100 text-emerald-600' : item.status === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-yellow-100 text-yellow-600'
                                                            }`}>
                                                                {item.status === 'completed' || item.status === 'active' ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="font-black text-gray-900 text-lg tabular-nums">₹{item.amount.toLocaleString('en-IN')}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button onClick={() => handleDownloadInvoice(item.zohoInvoiceId)} disabled={!item.zohoInvoiceId || downloadingId === item.zohoInvoiceId} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${!item.zohoInvoiceId ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-2 border-gray-100' : 'bg-white text-primary-600 border-2 border-primary-100 hover:bg-primary-600 hover:text-white hover:shadow-lg shadow-primary-100 active:scale-95'}`}>
                                                            {downloadingId === item.zohoInvoiceId ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <FiDownload size={14} />}
                                                            PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile/Tablet Card View */}
                            <div className="lg:hidden divide-y divide-gray-50">
                                {billingHistory.map((item, idx) => {
                                    const dateObj = formatDate(item.date);
                                    return (
                                        <div key={idx} className="p-6 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                                                        item.type === 'subscription_payment' ? 'bg-primary-100 text-primary-600' : item.type === 'banner_booking' ? 'bg-amber-100 text-amber-600' : item.type === 'wallet_recharge' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                                                    }`}>
                                                        {item.type === 'subscription_payment' ? <FiPackage /> : item.type === 'banner_booking' ? <FiImage /> : item.type === 'wallet_recharge' ? <FiCreditCard /> : <FiPlusCircle />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm leading-tight">{item.planName}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter line-clamp-1">REF: {item.transactionCode}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end shrink-0">
                                                    <span className="text-[14px] font-black text-gray-900 leading-none">{dateObj.day}</span>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{dateObj.month}</span>
                                                    <span className="text-[10px] font-black text-gray-400 tracking-tighter">{dateObj.year}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                                    item.status === 'completed' || item.status === 'active' ? 'bg-emerald-100 text-emerald-600' : item.status === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                    {item.status === 'completed' || item.status === 'active' ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                                                    {item.status}
                                                </span>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-black text-gray-900 text-base tabular-nums">₹{item.amount.toLocaleString('en-IN')}</span>
                                                    <button onClick={() => handleDownloadInvoice(item.zohoInvoiceId)} disabled={!item.zohoInvoiceId || downloadingId === item.zohoInvoiceId} className={`p-2 rounded-xl border-2 transition-all ${!item.zohoInvoiceId ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-primary-600 border-primary-100 hover:bg-primary-600 hover:text-white'}`}>
                                                        {downloadingId === item.zohoInvoiceId ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <FiDownload size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-gray-200 text-gray-300">
                                <FiCreditCard size={40} />
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Transactions Found</h4>
                            <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Your billing history will appear here once you purchase a subscription or add-on pack.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Billing;
