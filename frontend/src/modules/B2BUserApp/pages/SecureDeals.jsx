import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiPackage, FiTruck, FiMapPin, FiClock, FiCheckCircle, FiAlertCircle, FiXCircle, FiDownload, FiFileText } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import toast from '../../../shared/utils/toast';

const SecureDeals = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDeals = async () => {
        try {
            const res = await api.get('/order-deals/buyer');
            if (res.success) {
                setDeals(res.data);
            }
        } catch (error) {
            console.error('Error fetching secure deals:', error);
            toast.error('Failed to load secure deals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-600',
                    border: 'border-amber-100',
                    icon: FiClock
                };
            case 'accepted':
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-600',
                    border: 'border-emerald-100',
                    icon: FiCheckCircle
                };
            case 'rejected':
                return {
                    bg: 'bg-red-50',
                    text: 'text-red-600',
                    border: 'border-red-100',
                    icon: FiXCircle
                };
            default:
                return {
                    bg: 'bg-gray-50',
                    text: 'text-gray-600',
                    border: 'border-gray-100',
                    icon: FiAlertCircle
                };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Secure Deals" />

            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="bg-primary-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Secure Deals</h2>
                            <p className="text-primary-100 font-medium text-sm leading-relaxed opacity-90">
                                Tracking your trusted B2B transactions with platform escrow protection and verified settlement.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600"></div>
                        </div>
                    ) : deals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <FiShield size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">No Secure Deals Yet</h3>
                            <p className="text-gray-400 max-w-sm mt-2 font-medium">Start a secure deal from any vendor's product page to ensure safe transactions.</p>
                        </div>
                    ) : (
                        deals.map((deal) => {
                            const style = getStatusStyle(deal.status);
                            const StatusIcon = style.icon;

                            return (
                                <motion.div
                                    key={deal._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        {/* Seller Info */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seller Information</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-black">
                                                    {deal.sellerId?.storeName?.charAt(0) || deal.sellerId?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-800 uppercase text-[11px]">{deal.sellerId?.storeName || deal.sellerId?.name || 'Verified Vendor'}</p>
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        {deal.sellerId?.phone && (
                                                            <p className="text-[10px] text-gray-500 font-black flex items-center gap-1.5 uppercase tracking-tight">
                                                                PH: +91 {deal.sellerId.phone}
                                                            </p>
                                                        )}
                                                        {deal.sellerId?.email && (
                                                            <p className="text-[10px] text-primary-600 font-black flex items-center gap-1.5 lowercase tracking-tight">
                                                                {deal.sellerId.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`mt-2 px-4 py-1.5 rounded-full ${style.bg} ${style.text} ${style.border} border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit`}>
                                                <StatusIcon size={12} />
                                                {deal.status}
                                            </div>
                                        </div>

                                        {/* Order Info */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</h4>
                                            <div className="space-y-2">
                                                <p className="text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-tight">
                                                    <FiPackage className="text-primary-500" /> {deal.productName}
                                                </p>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase">Quantity</p>
                                                        <p className="text-sm font-black text-gray-800">{deal.quantity.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase">Per Unit</p>
                                                        <p className="text-sm font-black text-gray-800">₹{deal.pricePerUnit?.toLocaleString() || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deal Summary</h4>
                                            <div className="space-y-2">
                                                <p className="text-xl font-black text-primary-600">₹{deal.totalAmount.toLocaleString()}</p>
                                                <p className="text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg w-fit uppercase tracking-widest">
                                                    {deal.selectionOption === 'min_order' ? 'MIN ORDER COMMITMENT' : 'ESCROW FULL PAYMENT'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Logistics */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Logistics</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                    <FiTruck size={14} className="text-primary-500" /> {deal.transport || 'Standard'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                    <FiMapPin size={14} className="text-primary-500" /> {deal.station || 'Local'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-50">
                                                    <FiClock size={14} /> {new Date(deal.createdAt).toLocaleDateString('en-GB')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {deal.status === 'accepted' && (
                                        <div className="mt-4 space-y-4">
                                            <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                                                    <FiCheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Request Accepted</p>
                                                    <p className="text-[10px] font-bold text-emerald-600/80 leading-relaxed uppercase tracking-wider">
                                                        Seller has verified your order request. Please review the attached document and proceed with fulfillment.
                                                    </p>
                                                </div>
                                            </div>

                                            {deal.document ? (
                                                <div className="p-5 bg-primary-600 text-white rounded-[2rem] shadow-xl shadow-primary-100 flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                                            <FiFileText size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-primary-100 uppercase tracking-widest opacity-80">Vendor Uploaded PDF</p>
                                                            <p className="text-[11px] font-black uppercase tracking-tight">Invoice / Deal Terms.pdf</p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={deal.document}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-lg"
                                                    >
                                                        <FiDownload /> Review
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0">
                                                        <FiClock size={20} className="animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Waiting for Document</p>
                                                        <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-wider">
                                                            Vendor is preparing the invoice or agreement for this deal.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default SecureDeals;
