import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiMessageSquare, FiArrowRight, FiBriefcase, FiHash } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';

// Helper function to format relative time
const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

const B2BUserDashboard = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Business Dashboard" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col gap-8">
                    {/* Welcome Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
                    >
                        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Welcome to your Business Dashboard</h1>
                        <p className="text-gray-500 font-medium">Source products directly from manufacturers and wholesalers.</p>
                    </motion.div>

                    {/* How it works / Direct Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                                <FiMessageSquare className="text-2xl text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">Direct Communication</h2>
                            <p className="text-gray-500 leading-relaxed mb-6 font-medium">
                                Contact vendors directly via WhatsApp or Phone for quick quotes and negotiations. No more waiting for email responses.
                            </p>
                            <Link to="/b2b/catalog" className="text-primary-600 font-bold hover:underline flex items-center gap-2">
                                Start Browsing <FiArrowRight />
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6">
                                    <FiBriefcase className="text-2xl" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 tracking-tight">Expand Your Bulk Reach</h2>
                                <p className="text-primary-100 font-medium leading-relaxed mb-8">
                                    Connect with verified wholesalers across India. Get custom quotes and better pricing for high-volume orders.
                                </p>
                            </div>
                            <Link
                                to="/b2b/catalog"
                                className="w-full py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg text-center shadow-xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                            >
                                Explore Bulk Catalog <FiArrowRight />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default B2BUserDashboard;
