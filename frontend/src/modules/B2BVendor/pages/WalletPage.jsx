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
import { getMyWallet, initiateRecharge, verifyRecharge } from '../services/vendorWalletService';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';

const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    // Lock scroll when recharge modal is open
    useScrollLock(rechargeModalOpen);

    const fetchWallet = async () => {
        try {
            const data = await getMyWallet();
            setWallet(data);
        } catch (error) {
            toast.error('Failed to load wallet');
        } finally {
            setLoading(false);
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
                name: 'Dealing India',
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex justify-end">
                <button
                    onClick={() => setRechargeModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-semibold shadow-md shadow-primary-200"
                >
                    <FiPlus /> Recharge Wallet
                </button>
            </div>

            {/* Wallet Cards */}
            <div className="flex flex-col gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                        <div>
                            <span className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Available Balance</span>
                            <div className="text-5xl md:text-7xl font-black mt-4 tracking-tighter flex items-baseline gap-2">
                                <span className="text-2xl md:text-3xl text-slate-400">₹</span>
                                {wallet?.balance?.toLocaleString('en-IN') || 0}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border-2 border-slate-900 flex items-center justify-center text-[10px] font-black italic">VISA</div>
                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border-2 border-slate-900 flex items-center justify-center text-[10px] font-black italic">MC</div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Payments via Razorpay</span>
                            </div>
                            <button
                                onClick={() => setRechargeModalOpen(true)}
                                className="flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-900/20 active:scale-95"
                            >
                                <FiPlus className="text-lg" /> Recharge Now
                            </button>
                        </div>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-primary-600/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-150px] left-[-150px] w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]"></div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8"
                >
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-pink-50 rounded-[1.5rem] shrink-0">
                            <FiGift className="text-pink-600 text-3xl" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Referral Rewards</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Earn ₹50 for every verified vendor referral</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/b2b-vendor/referral'}
                        className="w-full md:w-auto px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95"
                    >
                        View Program Details
                    </button>
                </motion.div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/20">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Financial Ledger</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detailed transaction history</p>
                    </div>
                    <button 
                        onClick={fetchWallet}
                        className="p-3 bg-gray-50 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all active:rotate-180"
                    >
                        <FiRefreshCcw size={20} />
                    </button>
                </div>
                <div className="overflow-hidden">
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
                                            <p className="text-[9px] text-gray-400 font-mono truncate tracking-widest uppercase">ID: {tx.referenceId?.slice(-8) || '--'}</p>
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
