import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft, FiPackage, FiDollarSign, FiUser, FiCalendar, FiTag, FiList,
    FiLayers, FiInfo, FiLayers as FiGrid, FiBarChart2
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const LotSlotDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [lotSlot, setLotSlot] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchLotSlot();
    }, [id]);

    const fetchLotSlot = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/lot-slots/${id}`);
            if (response.success) {
                setLotSlot(response.data);
                setSelectedImage(response.data.image);
            }
        } catch (error) {
            console.error('Error fetching Lot/Slot:', error);
            toast.error('Failed to load details');
            navigate('/admin/b2b-vendors/lot-slots');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!lotSlot) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-7xl mx-auto px-4 pb-12"
        >
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-gray-50/80 backdrop-blur-md py-4 z-10 -mx-4 px-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/b2b-vendors/lot-slots')}
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500 hover:text-primary-600 transition-all"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="lg:hidden text-xl font-black text-gray-900 uppercase tracking-wider tabular-nums">LS-{lotSlot._id.slice(-6)}</h1>
                        <p className="text-gray-500 text-sm">Lot/Slot Booking Details</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${lotSlot.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {lotSlot.isActive ? 'Active Listing' : 'Inactive Listing'}
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Image Section */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-3xl p-3 shadow-xl border border-gray-100 sticky top-24">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={selectedImage}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    src={selectedImage || lotSlot.image}
                                    className="w-full h-full object-contain"
                                    alt={lotSlot.name}
                                />
                            </AnimatePresence>
                        </div>

                        {/* Gallery Thumbnails */}
                        {lotSlot.images?.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mt-3">
                                {[lotSlot.image, ...lotSlot.images].filter(Boolean).map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(img)}
                                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-primary-500 scale-95 shadow-lg' : 'border-transparent hover:border-gray-200 opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Basic Listing Details */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {lotSlot.category}
                            </span>
                            {lotSlot.subcategory && (
                                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">
                                    {lotSlot.subcategory}
                                </span>
                            )}
                            {lotSlot.brand && (
                                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-1">
                                    <FiTag size={10} /> {lotSlot.brand}
                                </span>
                            )}
                        </div>

                        <h2 className="text-3xl font-black text-gray-900 mb-2">{lotSlot.name}</h2>
                        <div className="mb-6">
                            <RatingSummaryBadge targetType="lotslot" targetId={lotSlot._id} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Base Price</p>
                                <p className="text-xl font-black text-primary-600 tracking-tight">₹{lotSlot.price}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">Per {lotSlot.unit || 'Unit'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MOQ</p>
                                <p className="text-xl font-black text-gray-900 tracking-tight">{lotSlot.moq}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">{lotSlot.unit || 'Units'} Required</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Availability</p>
                                <p className="text-sm font-black text-gray-900 uppercase mt-1">{lotSlot.availability || 'In Stock'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Listed On</p>
                                <p className="text-sm font-black text-gray-800 mt-1">{new Date(lotSlot.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4">
                                <FiInfo className="text-primary-500" /> Description
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {lotSlot.description || 'No description provided by sender.'}
                            </p>
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    {lotSlot.specifications?.length > 0 && (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6">
                                <FiList className="text-primary-500" /> Technical Specifications
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                                {lotSlot.specifications.map((spec, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 group hover:border-primary-100 transition-all">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider group-hover:text-primary-400">{spec.name}</span>
                                        <span className="text-sm font-bold text-gray-800">{spec.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bulk Pricing Tiers */}
                    {lotSlot.bulkPricing?.length > 0 && (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6">
                                <FiBarChart2 className="text-primary-500" /> Bulk Pricing Tiers
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {lotSlot.bulkPricing.map((tier, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-primary-50/50 border border-primary-100 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Qty: {tier.minQty}+</p>
                                        <p className="text-lg font-black text-primary-600 tracking-tight">₹{tier.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vendor Information */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        <h3 className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6 relative">
                            <FiUser className="text-primary-500" /> Vendor Intelligence
                        </h3>
                        {lotSlot.vendorId ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Identity</p>
                                        <p className="font-black text-gray-900">{lotSlot.vendorId.storeName}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{lotSlot.vendorId.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Verified Contacts</p>
                                        <p className="text-sm font-bold text-gray-700">{lotSlot.vendorId.email}</p>
                                        <p className="text-sm font-bold text-gray-700">{lotSlot.vendorId.phone}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl flex flex-col justify-center border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-black">
                                            {lotSlot.vendorId.storeName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Type</p>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">B2B Verified Vendor</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm font-bold">Vendor Intelligence Unavailable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default LotSlotDetail;
