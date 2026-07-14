import { useState, useEffect } from "react";
import { FiX, FiUsers, FiMail, FiPhone, FiCalendar, FiExternalLink } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../../../shared/utils/api";

const B2BVendorFollowersModal = ({ isOpen, onClose, vendor }) => {
    const [followers, setFollowers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (isOpen && vendor?.id || vendor?._id) {
            fetchFollowers();
        } else {
            setFollowers([]);
            setTotal(0);
        }
    }, [isOpen, vendor]);

    const fetchFollowers = async () => {
        setIsLoading(true);
        try {
            const vendorId = vendor._id || vendor.id;
            const response = await api.get(`/admin/b2b-vendors/${vendorId}/followers`);
            if (response.success) {
                setFollowers(response.data.followers || []);
                setTotal(response.data.total || 0);
            }
        } catch (error) {
            console.error("Error fetching followers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                                <FiUsers size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Vendor Followers</h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    {vendor?.name || vendor?.storeName} • {total} followers
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-900 shadow-sm"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-admin">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Loading followers...</p>
                            </div>
                        ) : followers.length > 0 ? (
                            <div className="grid gap-4">
                                {followers.map((follower, index) => (
                                    <motion.div
                                        key={follower._id || index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group p-4 bg-gray-50 hover:bg-white rounded-2xl border border-transparent hover:border-primary-100 hover:shadow-lg hover:shadow-primary-100/20 transition-all duration-300 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                {follower.avatar ? (
                                                    <img src={follower.avatar} alt={follower.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-600 font-bold text-lg">
                                                        {follower.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                                                        {follower.name}
                                                    </h4>
                                                    {follower.role === 'vendor' && (
                                                        <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-blue-100">
                                                            Vendor
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 mt-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                            <FiMail className="text-primary-500 text-xs" />
                                                            <span className="text-sm font-bold text-slate-700">{follower.email}</span>
                                                        </div>
                                                        {follower.phone && (
                                                            <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                <FiPhone className="text-green-500 text-xs" />
                                                                <span className="text-sm font-bold text-slate-700">{follower.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">
                                                        <FiCalendar size={11} className="text-slate-300" />
                                                        Followed On: <span className="text-slate-500">{new Date(follower.followedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FiUsers size={32} className="opacity-20" />
                                </div>
                                <p className="font-bold text-sm uppercase tracking-widest">No followers yet</p>
                                <p className="text-xs font-medium">This vendor doesn't have any followers yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Showing {followers.length} of {total} followers
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-white px-5 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-sm border border-gray-100"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default B2BVendorFollowersModal;
