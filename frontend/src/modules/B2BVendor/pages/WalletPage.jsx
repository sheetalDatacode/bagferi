import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiCreditCard, 
    FiArrowUpRight, 
    FiArrowDownLeft, 
    FiClock, 
    FiPlus, 
    FiInfo,
    FiRefreshCcw,
    FiCheckCircle,
    FiXCircle,
    FiLayers,
    FiGift
} from 'react-icons/fi';
import { getMyWallet, initiateRecharge, verifyRecharge, getPayoutSummary, requestPayout } from '../services/vendorWalletService';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { FiChevronDown, FiChevronUp, FiSend } from 'react-icons/fi';

const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [payouts, setPayouts] = useState([]);
    const [expandedMonths, setExpandedMonths] = useState({});
    const [subTab, setSubTab] = useState('all');

    // Lock scroll when recharge modal is open
    useScrollLock(rechargeModalOpen);

    const toggleMonth = (m) => {
        setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));
    };

    const fetchWallet = async () => {
        try {
            const data = await getMyWallet();
            setWallet(data);
            const payoutData = await getPayoutSummary();
            setPayouts(payoutData);
        } catch (error) {
            toast.error('Failed to load wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async (month, period, amount) => {
        try {
            toast.loading('Submitting payout request...', { id: 'payout-req' });
            await requestPayout(month, period, amount);
            toast.success('Payout request submitted successfully!', { id: 'payout-req' });
            fetchWallet();
        } catch (err) {
            toast.error(err.message || 'Failed to submit payout request', { id: 'payout-req' });
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleRecharge = async (e) => {
        e.preventDefault();
        const baseAmount = parseFloat(rechargeAmount);
        if (!baseAmount || baseAmount < 100) {
            return toast.error('Minimum recharge amount is ₹100');
        }

        const totalPayable = Math.round(baseAmount * 1.18 * 100) / 100;

        setProcessing(true);
        try {
            const order = await initiateRecharge(totalPayable);
            
            const options = {
                key: order.razorpayKeyId,
                amount: order.amount,
                currency: 'INR',
                name: 'Bagferi',
                description: 'Wallet Recharge',
                order_id: order.id,
                handler: async (response) => {
                    try {
                        setRechargeModalOpen(false);
                        toast.loading('Verifying payment...', { id: 'wallet-recharge' });
                        
                        // Optimistic update for immediate feedback
                        setWallet(prev => prev ? {
                            ...prev,
                            balance: prev.balance + baseAmount
                        } : prev);

                        await verifyRecharge({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: totalPayable
                        });
                        
                        toast.success('Wallet recharged successfully!', { id: 'wallet-recharge' });
                        setRechargeAmount('');
                        fetchWallet();
                    } catch (error) {
                        toast.error(error.message || 'Verification failed', { id: 'wallet-recharge' });
                        fetchWallet(); // Refetch to revert optimistic update if failed
                    }
                },
                modal: {
                    ondismiss: () => setProcessing(false)
                },
                prefill: {
                    name: '',
                    email: '',
                },
                theme: { color: '#4F46E5' }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error(error.message || 'Failed to initiate payment');
        } finally {
            setProcessing(false);
        }
    };

    const [activeTab, setActiveTab] = useState('platform'); // 'platform' or 'earnings'

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const getTransactionIcon = (type, referenceType) => {
        if (type === 'credit') {
            if (referenceType === 'referral_reward') return <FiGift className="text-pink-500" />;
            return <FiArrowUpRight className="text-green-500" />;
        }
        if (referenceType === 'addon_plan') return <FiLayers className="text-indigo-500" />;
        return <FiArrowDownLeft className="text-red-500" />;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Earnings & Wallet</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your platform credits and track your revenue</p>
                </div>
                <button
                    onClick={() => setRechargeModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-semibold shadow-md shadow-primary-200"
                >
                    <FiPlus /> Recharge Wallet
                </button>
            </div>

            {/* Revenue Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Platform Wallet */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl"
                >
                    <div className="relative z-10 flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Platform Wallet</span>
                            <FiCreditCard className="text-slate-400 text-xl" />
                        </div>
                        <div className="text-4xl font-black tracking-tighter flex items-baseline gap-1">
                            <span className="text-xl text-slate-400">₹</span>
                            {wallet?.balance?.toLocaleString('en-IN') || 0}
                        </div>
                        <div className="mt-auto pt-4 border-t border-white/10">
                            <button
                                onClick={() => setRechargeModalOpen(true)}
                                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest active:scale-95"
                            >
                                Recharge Now
                            </button>
                        </div>
                    </div>
                    {/* Decorative */}
                    <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-primary-600/30 rounded-full blur-[40px]"></div>
                </motion.div>

                {/* COD Revenue */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-full bg-white border border-gray-100 rounded-3xl p-6 relative overflow-hidden shadow-md"
                >
                    <div className="relative z-10 flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">COD Earnings (In Hand)</span>
                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><FiCheckCircle /></div>
                        </div>
                        <div className="text-4xl font-black text-gray-900 tracking-tighter flex items-baseline gap-1">
                            <span className="text-xl text-emerald-500">₹</span>
                            {wallet?.revenue?.codRevenue?.toLocaleString('en-IN') || 0}
                        </div>
                        <div className="mt-auto pt-4 border-t border-gray-100 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                            Cash collected directly on delivery
                        </div>
                    </div>
                </motion.div>

                {/* Online Revenue */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full bg-white border border-gray-100 rounded-3xl p-6 relative overflow-hidden shadow-md"
                >
                    <div className="relative z-10 flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                            <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">Online Earnings</span>
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><FiCreditCard /></div>
                        </div>
                        <div className="text-4xl font-black text-gray-900 tracking-tighter flex items-baseline gap-1">
                            <span className="text-xl text-blue-500">₹</span>
                            {wallet?.revenue?.onlineRevenue?.toLocaleString('en-IN') || 0}
                        </div>
                        <div className="mt-auto pt-4 border-t border-gray-100 text-[10px] font-bold text-amber-500 tracking-widest uppercase flex items-center justify-between">
                            <span>Pending Collection: ₹{wallet?.revenue?.pendingRevenue?.toLocaleString('en-IN') || 0}</span>
                            <FiClock />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/20">
                <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Financial Ledger</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detailed transaction history</p>
                    </div>
                    
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl w-full md:w-auto">
                        <button 
                            onClick={() => setActiveTab('platform')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'platform' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Platform Wallet
                        </button>
                        <button 
                            onClick={() => setActiveTab('earnings')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 justify-center ${activeTab === 'earnings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Order Earnings
                            {wallet?.revenue?.pendingRevenue > 0 && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                        </button>
                    </div>

                    <button 
                        onClick={fetchWallet}
                        className="p-3 bg-gray-50 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all active:rotate-180 hidden md:block"
                    >
                        <FiRefreshCcw size={20} />
                    </button>
                </div>
                
                <div className="overflow-hidden">
                    {activeTab === 'platform' ? (
                        <>
                            {/* Desktop View Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                            <th className="px-8 py-5">Transaction Details</th>
                                            <th className="px-8 py-5">Timestamp</th>
                                            <th className="px-8 py-5 text-right">Amount (INR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {wallet?.transactions?.length > 0 ? (
                                            wallet.transactions.map((tx) => (
                                                <tr key={tx._id} className="hover:bg-gray-50/30 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`p-3 rounded-2xl bg-gray-50 group-hover:bg-white shadow-sm transition-all flex items-center justify-center`}>
                                                                {getTransactionIcon(tx.type, tx.referenceType)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900 capitalize tracking-tight mb-1">
                                                                    {tx.description || tx.referenceType?.replace('_', ' ')}
                                                                </p>
                                                                <p className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">REF: {tx.referenceId || '--'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                                                            {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={`text-lg font-black tracking-tighter ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                                            {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200">
                                                            <FiClock size={32} />
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No transactions recorded</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View Cards */}
                            <div className="md:hidden divide-y divide-gray-50">
                                {wallet?.transactions?.length > 0 ? (
                                    wallet.transactions.map((tx) => (
                                        <div key={tx._id} className="p-6 flex items-center gap-5 hover:bg-gray-50 transition-colors">
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shadow-sm`}>
                                                {getTransactionIcon(tx.type, tx.referenceType)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-xs font-black text-gray-900 capitalize truncate pr-2 tracking-tight">
                                                        {tx.description || tx.referenceType?.replace('_', ' ')}
                                                    </p>
                                                    <span className={`text-sm font-black whitespace-nowrap tracking-tighter ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                                        {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] text-gray-400 font-mono truncate tracking-widest uppercase">REF: {tx.referenceId?.slice(-8) || '--'}</p>
                                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200">
                                                <FiClock size={32} />
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No transactions yet</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-6 md:p-8 space-y-6">
                            {/* Sub Tabs */}
                            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-50">
                                {[
                                    { id: 'all', label: 'All Cycles' },
                                    { id: 'claimable', label: 'Claimable Amount' },
                                    { id: 'pending', label: 'Requested (Pending)' },
                                    { id: 'paid', label: 'Received (Paid)' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSubTab(tab.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            subTab === tab.id
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {(() => {
                                const filteredPayouts = payouts.filter(p => {
                                    if (subTab === 'pending') return p.payoutStatus === 'Pending';
                                    if (subTab === 'paid') return p.payoutStatus === 'Approved';
                                    if (subTab === 'claimable') return p.claimableAmount > 0 && p.payoutStatus !== 'Approved' && p.payoutStatus !== 'Pending';
                                    return true;
                                });

                                if (filteredPayouts.length === 0) {
                                    return (
                                        <div className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200">
                                                    <FiClock size={32} />
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No matching cycles found</p>
                                            </div>
                                        </div>
                                    );
                                }

                                return Object.entries(
                                    filteredPayouts.reduce((acc, p) => {
                                        if (!acc[p.month]) acc[p.month] = [];
                                        acc[p.month].push(p);
                                        return acc;
                                    }, {})
                                ).map(([monthName, periodList]) => {
                                    const isExpanded = !!expandedMonths[monthName];
                                    const totalOrders = periodList.reduce((sum, p) => sum + p.totalOrders, 0);
                                    const totalCod = periodList.reduce((sum, p) => sum + p.codCollected, 0);
                                    const totalPending = periodList.reduce((sum, p) => sum + p.pendingAmount, 0);
                                    const totalCleared = periodList.reduce((sum, p) => sum + p.clearedAmount, 0);
                                    const totalClaimable = periodList.reduce((sum, p) => sum + p.claimableAmount, 0);

                                    return (
                                        <div key={monthName} className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                            {/* Accordion Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleMonth(monthName)}
                                                className="w-full px-6 py-5 bg-gray-50/50 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="text-left">
                                                        <h4 className="text-base font-black text-gray-900 tracking-tight">{monthName}</h4>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{totalOrders} Completed Orders</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 text-left">
                                                    <div>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">COD Earnings</span>
                                                        <span className="text-sm font-black text-emerald-600">₹{totalCod.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Claimable</span>
                                                        <span className="text-sm font-black text-blue-600">₹{totalClaimable.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Requested</span>
                                                        <span className="text-sm font-black text-amber-500">₹{totalPending.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Received</span>
                                                        <span className="text-sm font-black text-gray-800">₹{totalCleared.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="pl-4 border-l border-gray-200 text-gray-400">
                                                        {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Accordion Content */}
                                            {isExpanded && (
                                                <div className="p-6 bg-white divide-y divide-gray-100 space-y-6">
                                                    {periodList.map((p, idx) => (
                                                        <div key={idx} className="pt-6 first:pt-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-6 text-left">
                                                            <div className="col-span-2 md:col-span-4 lg:col-span-2">
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Period Cycle</span>
                                                                <span className="text-sm font-black text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 inline-block">
                                                                    Week {p.period === '1-7' ? '1 (1-7)' : p.period === '8-15' ? '2 (8-15)' : p.period === '16-23' ? '3 (16-23)' : '4 (24-31)'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Completed</span>
                                                                <span className="text-sm font-bold text-gray-700">{p.totalOrders} orders</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">COD In-Hand</span>
                                                                <span className="text-sm font-bold text-gray-900">₹{p.codCollected.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Total Advance</span>
                                                                <span className="text-sm font-bold text-gray-900">₹{p.advanceHeld.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Platform Fee</span>
                                                                <span className="text-sm font-bold text-red-500">₹{p.platformFee.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Claimable</span>
                                                                <span className="text-sm font-bold text-blue-600">₹{p.claimableAmount.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Locked (3d)</span>
                                                                <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
                                                                    ₹{p.lockedAmount.toLocaleString('en-IN')}
                                                                    {p.lockedAmount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Received</span>
                                                                <span className="text-sm font-bold text-green-600">₹{p.clearedAmount.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="col-span-2 md:col-span-4 lg:col-span-1 flex items-center justify-end">
                                                                {p.payoutStatus === 'Approved' ? (
                                                                    <div className="text-right">
                                                                        <span className="inline-block px-2.5 py-1 rounded-lg bg-green-50 text-green-600 font-bold text-[10px] uppercase">Paid</span>
                                                                        {p.referenceNumber && (
                                                                            <p className="text-[8px] text-gray-400 font-mono mt-1">UTR: {p.referenceNumber}</p>
                                                                        )}
                                                                    </div>
                                                                ) : p.payoutStatus === 'Pending' ? (
                                                                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold text-[10px] uppercase">Requested</span>
                                                                ) : p.payoutStatus === 'Rejected' ? (
                                                                    <div className="flex flex-col gap-1 items-end">
                                                                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-bold text-[10px] uppercase">Rejected</span>
                                                                        {p.claimableAmount > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRequestPayout(p.month, p.period, p.claimableAmount)}
                                                                                className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[9px] font-bold uppercase"
                                                                            >
                                                                                Re-request
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : p.claimableAmount > 0 ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRequestPayout(p.month, p.period, p.claimableAmount)}
                                                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        <FiSend size={12} /> Request Payout
                                                                    </button>
                                                                ) : p.lockedAmount > 0 ? (
                                                                    <span className="text-[9px] text-gray-450 italic font-bold">Matures in 3d</span>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400 italic">No balance</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>


            {/* Recharge Modal */}
            <AnimatePresence>
                {rechargeModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !processing && setRechargeModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Add Money</h2>
                                        <p className="text-gray-500 text-sm mt-1">Recharge your wallet to enjoy platform services</p>
                                    </div>
                                    {!processing && (
                                        <button onClick={() => setRechargeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <FiXCircle className="text-gray-400 text-xl" />
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleRecharge} className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Amount (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
                                            <input 
                                                autoFocus
                                                type="number"
                                                required
                                                min="100"
                                                value={rechargeAmount}
                                                onChange={(e) => setRechargeAmount(e.target.value)}
                                                placeholder="Enter amount (Min ₹100)"
                                                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-500 focus:bg-white rounded-2xl py-4 pl-10 pr-4 text-2xl font-black outline-none transition-all placeholder:text-gray-200"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {[500, 1000, 2000, 5000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setRechargeAmount(amt.toString())}
                                                    className="px-4 py-1.5 rounded-full border border-gray-100 text-xs font-semibold text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-all hover:bg-primary-50"
                                                >
                                                    +₹{amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {rechargeAmount >= 100 && (
                                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Recharge Amount</span>
                                                <span className="font-bold">₹{parseFloat(rechargeAmount).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>GST (18%)</span>
                                                <span className="font-bold">+ ₹{(Math.round(rechargeAmount * 0.18 * 100) / 100).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-black text-primary-600">
                                                <span>Total Payable</span>
                                                <span>₹{(Math.round(rechargeAmount * 1.18 * 100) / 100).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-indigo-50/50 p-4 rounded-2xl flex gap-3 items-start">
                                        <FiInfo className="text-primary-600 mt-1 flex-shrink-0" />
                                        <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                                            The recharge amount will be added to your spendable balance. GST is charged as per government regulations and an official invoice will be emailed to you.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className={`w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>Proceed to Payment</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalletPage;
