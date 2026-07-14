import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiPackage, FiUser, FiMapPin, FiCheck, FiX, FiInfo, FiClock, FiUpload, FiFileText, FiDownload } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from '../../../shared/utils/toast';

const SecureDeals = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDeals = async () => {
        try {
            const res = await api.get('/order-deals/seller');
            if (res.success) {
                setDeals(res.data);
            }
        } catch (error) {
            console.error('Error fetching secure deals:', error);
            toast.error('Failed to load secure deal requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, []);

    const handleAction = async (id, status) => {
        try {
            const res = await api.patch(`/order-deals/${id}/status`, { status });
            if (res.success) {
                toast.success(`Deal ${status} successfully!`);
                fetchDeals(); // Refresh list
            }
        } catch (error) {
            console.error(`Error updating deal status:`, error);
            toast.error(error.response?.data?.message || `Failed to update deal status`);
        }
    };

    const handleDocumentUpload = async (id, file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('document', file);

        try {
            toast.loading('Uploading document...');
            const res = await api.post(`/order-deals/${id}/upload`, formData);
            toast.dismiss();
            if (res.success) {
                toast.success('Document uploaded successfully!');
                fetchDeals();
            }
        } catch (error) {
            toast.dismiss();
            console.error('Error uploading document:', error);
            toast.error(error.response?.data?.message || 'Failed to upload document');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
        >
            <header className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <FiShield className="text-primary-600" />
                        Secure Deal Requests
                    </h1>
                    <p className="text-slate-400 font-medium mt-2">Manage your trusted B2B transactions and escrow deals</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 bg-primary-50 px-6 py-3 rounded-2xl border border-primary-100">
                    <div className="flex items-center gap-2 pr-4 border-r border-primary-100/50">
                        <FiInfo className="text-primary-600" />
                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Safe Settlement</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                            {deals.filter(d => d.status === 'pending').length}
                        </div>
                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Pending</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600"></div>
                    </div>
                ) : deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <FiShield size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Requests Yet</h3>
                        <p className="text-slate-400 max-w-sm mt-2">Your secure deal requests from customers will appear here. They can start a deal from your product pages.</p>
                    </div>
                ) : (
                    deals.map((deal) => (
                        <motion.div
                            key={deal._id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                {/* Buyer Info */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Buyer Information</h4>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center text-slate-400 font-black border border-slate-200">
                                            {deal.buyerId?.avatar ? (
                                                <img src={deal.buyerId.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                deal.buyerId?.name?.charAt(0) || deal.buyerId?.storeName?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 uppercase text-[11px]">{deal.buyerId?.name || deal.buyerId?.storeName || 'N/A'}</p>
                                            <p className="text-[9px] font-black text-primary-600 uppercase tracking-tight">
                                                {deal.buyerId?.businessInfo?.companyName || 'Individual Buyer'}
                                            </p>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-tight">
                                                    <FiMapPin size={10} /> {deal.buyerId?.address?.city || deal.buyerId?.businessInfo?.address?.city || 'City Unknown'}
                                                </p>
                                                {deal.buyerId?.phone && (
                                                    <p className="text-[10px] text-slate-500 font-black flex items-center gap-1.5 uppercase tracking-tight">
                                                        PH: +91 {deal.buyerId.phone}
                                                    </p>
                                                )}
                                                {deal.buyerId?.businessInfo?.gstNumber && (
                                                    <p className="text-[10px] text-emerald-600 font-black flex items-center gap-1.5 uppercase tracking-tight">
                                                        GST: {deal.buyerId.businessInfo.gstNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${deal.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            deal.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                'bg-red-50 text-red-600 border border-red-100'
                                            }`}>
                                            {deal.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Info */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Details</h4>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <FiPackage className="text-primary-500" /> {deal.productName}
                                        </p>
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Quantity</p>
                                                <p className="text-sm font-black text-slate-800">{deal.quantity.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Per Unit</p>
                                                <p className="text-sm font-black text-slate-800">₹{deal.pricePerUnit.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment & Logistics */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Summary</h4>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black text-primary-600">₹{deal.totalAmount.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg w-fit">
                                            {deal.selectionOption === 'min_order' ? 'MIN ORDER COMMITMENT' : 'ESCROW FULL PAYMENT'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col justify-center gap-3">
                                    {deal.status === 'accepted' ? (
                                        <div className="space-y-3">
                                            <div className="text-center p-4 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Status: Accepted</p>
                                                {deal.document ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                            <FiCheck className="text-emerald-500" /> Document Uploaded
                                                        </span>
                                                        <a
                                                            href={deal.document}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black text-primary-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <FiDownload /> View PDF
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-slate-400">Waiting for Invoice/PDF</p>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id={`doc-upload-${deal._id}`}
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleDocumentUpload(deal._id, e.target.files[0])}
                                                />
                                                <label
                                                    htmlFor={`doc-upload-${deal._id}`}
                                                    className="w-full py-4 bg-primary-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    <FiUpload size={16} /> {deal.document ? 'Update Document' : 'Upload Invoice/PDF'}
                                                </label>
                                            </div>
                                        </div>
                                    ) : deal.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(deal._id, 'accepted')}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <FiCheck size={16} /> Accept Deal
                                            </button>
                                            <button
                                                onClick={() => handleAction(deal._id, 'rejected')}
                                                className="w-full py-4 bg-white text-slate-400 border border-slate-100 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <FiX size={16} /> Reject Request
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Finalized</p>
                                            <p className="text-xs font-black uppercase text-red-600">
                                                Request Rejected
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Additional Details Accordion-like Footer */}
                            <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Transport</p>
                                    <p className="text-xs font-bold text-slate-700">{deal.transport}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Station</p>
                                    <p className="text-xs font-bold text-slate-700">{deal.station}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date Received</p>
                                    <p className="text-xs font-bold text-slate-700">{new Date(deal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deal ID</p>
                                    <p className="text-[10px] font-mono text-slate-300 uppercase">#{deal._id.slice(-8)}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default SecureDeals;
