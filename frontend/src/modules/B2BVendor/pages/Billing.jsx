import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiCreditCard, FiDownload, FiInfo, FiRefreshCw, 
    FiPackage, FiPlusCircle, FiGrid, FiClock, FiImage,
    FiCheckCircle, FiXCircle, FiArrowRight, FiFileText, FiPrinter, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import api from '../../../shared/utils/api';
import { appLogo } from '../../../data/logos';

const Billing = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [billingHistory, setBillingHistory] = useState([]);
    const [orderInvoices, setOrderInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'transactions'
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);

    // Order Invoice modal state
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            setLoading(true);
            const [walletRes, ordersRes] = await Promise.all([
                api.get('/vendor/wallet').catch(() => ({ success: false, data: { transactions: [] } })),
                api.get('/order/vendor/orders').catch(() => ({ success: false, data: [] }))
            ]);
            setBillingHistory(walletRes?.data?.transactions || []);
            if (ordersRes && ordersRes.success && ordersRes.data) {
                setOrderInvoices(ordersRes.data);
            }
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
            
            const url = `${api.defaults.baseURL}/vendor/wallet/invoice/${invoiceId}`;
            const token = localStorage.getItem('b2b-vendor-token');
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download invoice');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `invoice-${invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
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

            {/* Billing History Tabs & Table */}
            <div className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200 shrink-0">
                            <FiClock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Billing & Invoices</h3>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Customer order bills and wallet transaction invoices</p>
                        </div>
                    </div>

                    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 gap-1 w-fit">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <FiFileText size={16} /> Order Bills ({orderInvoices.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'transactions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <FiCreditCard size={16} /> Wallet & Plans ({billingHistory.length})
                        </button>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                    {activeTab === 'orders' ? (
                        orderInvoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <th className="px-8 py-5">Order No & Date</th>
                                            <th className="px-8 py-5">Customer Name</th>
                                            <th className="px-8 py-5 text-center">Total Amount</th>
                                            <th className="px-8 py-5 text-center">Paid Amount</th>
                                            <th className="px-8 py-5 text-center">Remaining Amount</th>
                                            <th className="px-8 py-5 text-center">Status</th>
                                            <th className="px-8 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orderInvoices.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-gray-900 text-sm">#{order.orderNumber}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                                </td>
                                                <td className="px-8 py-5 font-bold text-gray-800 text-sm">
                                                    {order.shippingAddress?.fullName || 'Customer'}
                                                </td>
                                                <td className="px-8 py-5 text-center font-black text-gray-900">
                                                    ₹{order.totalAmount?.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-8 py-5 text-center font-bold text-emerald-600">
                                                    ₹{(order.advancePayment || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-8 py-5 text-center font-bold text-amber-600">
                                                    ₹{((order.totalAmount || 0) - (order.advancePayment || 0)).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-100">
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrderForInvoice(order);
                                                            setIsInvoiceModalOpen(true);
                                                        }}
                                                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-1.5 ml-auto"
                                                    >
                                                        <FiFileText size={14} /> View Bill
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-16 text-center">
                                <FiFileText className="text-gray-300 text-5xl mx-auto mb-4" />
                                <h4 className="text-lg font-black text-gray-900 mb-1 uppercase">No Order Invoices Found</h4>
                                <p className="text-gray-400 text-xs font-medium">Customer order bills will appear here automatically.</p>
                            </div>
                        )
                    ) : (
                        billingHistory.length > 0 ? (
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
                                                                    <p className="font-black text-gray-900 text-sm leading-tight">{item.planName || item.description}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Ref: {item.transactionCode || item.id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="text-sm font-bold text-gray-500 tabular-nums">{dateObj.day} {dateObj.month} {dateObj.year}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className="flex justify-center">
                                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                                                    item.status === 'completed' || item.status === 'active' || item.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : item.status === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-yellow-100 text-yellow-600'
                                                                }`}>
                                                                    {item.status === 'completed' || item.status === 'active' || item.status === 'Paid' ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                                                                    {item.status}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="font-black text-gray-900 text-lg tabular-nums">₹{item.amount?.toLocaleString('en-IN')}</span>
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
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-gray-200 text-gray-300">
                                    <FiCreditCard size={40} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Transactions Found</h4>
                                <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Your wallet or plan transaction history will appear here.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Printable Order Invoice Modal */}
            {isInvoiceModalOpen && selectedOrderForInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 border border-gray-100">
                        {/* Header bar */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                            <div className="flex items-center gap-2">
                                <FiFileText className="text-primary-400" size={20} />
                                <h3 className="font-black uppercase tracking-wider text-sm">Order Bill & Invoice</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.print()} 
                                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                    <FiPrinter size={14} /> Print Bill
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsInvoiceModalOpen(false);
                                        setSelectedOrderForInvoice(null);
                                    }} 
                                    className="text-gray-400 hover:text-white"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Bill Container */}
                        <div id="printable-bill" className="p-8 space-y-6 text-left bg-white text-gray-900">
                            {/* Top Brand Header */}
                            <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                                <div className="flex items-center gap-3">
                                    {appLogo.src ? (
                                        <img src={appLogo.src} alt="Bagferi" className="h-12 object-contain" />
                                    ) : (
                                        <span className="text-2xl font-black tracking-tight text-primary-600">BAGFERI</span>
                                    )}
                                    <div>
                                        <span className="text-xs font-black uppercase text-primary-600 block tracking-widest">B2B Marketplace</span>
                                        <span className="text-[10px] text-gray-400 font-bold block">Tax Invoice / Order Receipt</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">TAX INVOICE</h2>
                                    <p className="text-xs font-bold text-gray-500 mt-1">Invoice #: <span className="text-gray-900">INV-{selectedOrderForInvoice.orderNumber}</span></p>
                                    <p className="text-xs font-medium text-gray-500">Date: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('en-IN')}</p>
                                    <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Status: {selectedOrderForInvoice.status}
                                    </span>
                                </div>
                            </div>

                            {/* Bill From & Bill To */}
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                {/* Bill From */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill From (Merchant / Shop)</p>
                                    <p className="text-sm font-black text-gray-900">{vendor?.storeName || 'Bagferi Authorized Vendor'}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-1">{vendor?.businessType || 'B2B Merchant'}</p>
                                    <p className="text-xs text-gray-600 font-medium">{vendor?.phone || vendor?.mobile || 'Mobile: N/A'}</p>
                                    <p className="text-xs text-gray-600 font-medium">{vendor?.email || 'N/A'}</p>
                                </div>

                                {/* Bill To */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill To (Customer)</p>
                                    <p className="text-sm font-black text-gray-900">{selectedOrderForInvoice.shippingAddress?.fullName || 'Valued Customer'}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                        {selectedOrderForInvoice.shippingAddress?.addressLine1 || selectedOrderForInvoice.shippingAddress?.streetAddress || ''}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {selectedOrderForInvoice.shippingAddress?.city || ''}, {selectedOrderForInvoice.shippingAddress?.state || ''} - {selectedOrderForInvoice.shippingAddress?.pincode || ''}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">Area: {
                                        selectedOrderForInvoice.shippingAddress?.areaName || 
                                        (selectedOrderForInvoice.user || selectedOrderForInvoice.userId)?.addresses?.find(addr => 
                                            addr.pincode === selectedOrderForInvoice.shippingAddress?.pincode && 
                                            (addr.streetAddress === selectedOrderForInvoice.shippingAddress?.addressLine1 || addr.streetAddress === selectedOrderForInvoice.shippingAddress?.streetAddress)
                                        )?.areaName || 'N/A'
                                    }</p>
                                    <p className="text-xs text-gray-600 font-medium">Phone: {selectedOrderForInvoice.shippingAddress?.phone || selectedOrderForInvoice.user?.phone || selectedOrderForInvoice.userId?.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Item Table */}
                            <div>
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Order Items Summary</h4>
                                <table className="w-full text-left border-collapse border border-gray-200 rounded-xl overflow-hidden text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-black uppercase">
                                            <th className="p-3">#</th>
                                            <th className="p-3">Item Description</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-right">Price</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {selectedOrderForInvoice.items?.map((item, idx) => {
                                            const qty = item.quantity || 1;
                                            const price = item.price || (selectedOrderForInvoice.totalAmount / (selectedOrderForInvoice.items.length || 1));
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-gray-900">{item.product?.name || item.name || 'B2B Product'}</td>
                                                    <td className="p-3 text-center font-bold">{qty}</td>
                                                    <td className="p-3 text-right font-medium">₹{price.toLocaleString('en-IN')}</td>
                                                    <td className="p-3 text-right font-bold text-gray-900">₹{(price * qty).toLocaleString('en-IN')}</td>
                                                </tr>
                                            );}
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment Breakdown Box */}
                            <div className="flex justify-end">
                                <div className="w-full sm:w-80 bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
                                    <div className="flex justify-between items-center text-xs text-slate-300 font-medium">
                                        <span>Total Order Amount</span>
                                        <span className="font-bold text-white">₹{selectedOrderForInvoice.totalAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-emerald-400 font-bold border-t border-slate-800 pt-2">
                                        <span>Paid Amount (Advance)</span>
                                        <span>₹{(selectedOrderForInvoice.advancePayment || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black text-amber-400 border-t border-slate-700 pt-2">
                                        <span>Remaining Amount</span>
                                        <span>₹{((selectedOrderForInvoice.totalAmount || 0) - (selectedOrderForInvoice.advancePayment || 0)).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Footer */}
                            <div className="border-t border-gray-100 pt-4 text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Thank you for doing business with Bagferi B2B Marketplace!</p>
                            </div>
                        </div>

                        {/* Footer bar */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setIsInvoiceModalOpen(false);
                                    setSelectedOrderForInvoice(null);
                                }} 
                                className="px-5 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => window.print()} 
                                className="px-5 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                            >
                                <FiPrinter size={14} /> Print Bill / Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Billing;
