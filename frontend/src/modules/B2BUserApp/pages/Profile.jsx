import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiSettings, FiBell, FiHelpCircle, FiLogOut, FiBriefcase, FiArrowRight, FiShoppingBag, FiX, FiCopy, FiShare2, FiInstagram, FiFacebook, FiYoutube, FiPlayCircle, FiShield, FiPhoneCall, FiMail, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { handleShare } from '../../../shared/utils/share';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getMyReferralSummary } from '../../../shared/services/referralService';
import { getSupportConfig } from '../../../shared/services/supportService';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { isAuthenticated: isVendorAuthenticated } = useB2BVendorAuthStore();
    const [referralData, setReferralData] = useState(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState('');
    const [supportConfig, setSupportConfig] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Lock scroll when modals are open
    useScrollLock(showLogoutModal || showDeleteModal);

    const menuItems = [
        { icon: FiBriefcase, label: 'Company Profile', desc: 'Manage your business details & GST', path: '/b2b/company' },
        { icon: FiBell, label: 'Notifications', desc: 'Manage inquiry alerts', path: '/b2b/notifications' },
        { icon: FiHelpCircle, label: 'Support & FAQs', desc: 'Get help with your bulk orders', path: '/b2b/support' },
        { icon: FiPlayCircle, label: 'How to Use', desc: 'Watch a guide to the platform', path: '/b2b/how-to-use' },
        { icon: FiShield, label: 'Terms & Conditions', desc: 'Platform legal guidelines', path: '/terms?type=user' },
    ];

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/b2b/login'); // Changed from /app/login to match existing B2B routes
    };

    const confirmDeleteAccount = async () => {
        try {
            setIsDeleting(true);
            const res = await api.delete('/auth/user/delete-account');
            if (res.success) {
                toast.success('Account deleted successfully');
                logout();
                navigate('/b2b/login');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete account');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    useEffect(() => {
        const fetchSupport = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) setSupportConfig(res.data);
            } catch (err) {}
        };
        fetchSupport();

        const loadReferral = async () => {
            setReferralLoading(true);
            setReferralError('');
            try {
                const data = await getMyReferralSummary();
                setReferralData(data);
            } catch (error) {
                console.error('Failed to load referral summary:', error);
                setReferralError(error?.response?.data?.message || error?.message || 'Unable to load referral details');
            } finally {
                setReferralLoading(false);
            }
        };

        if (user?._id) {
            loadReferral();
        }
    }, [user?._id]);

    const handleShareReferral = async () => {
        if (!referralData?.referralCode) return;
        // Derive the backend OG share URL for rich WhatsApp/social preview
        const apiBase = api.defaults.baseURL || '';
        const backendBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase.replace(/\/api\/?$/, '');
        const shareUrl = `${backendBase}/api/referrals/share/${referralData.referralCode}`;
        await handleShare({
            title: 'Join Dealing India - B2B Marketplace',
            text: `Join Dealing India using my referral code: ${referralData.referralCode}\nDownload App: https://play.google.com/store/apps/details?id=com.dealingindia.app`,
            url: shareUrl,
        });
    };

    const copyReferralLink = async () => {
        if (!referralData?.referralCode) return;
        try {
            // Copy the backend OG share URL — pasting it in WhatsApp shows the rich preview
            const apiBase = api.defaults.baseURL || '';
            const backendBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase.replace(/\/api\/?$/, '');
            const shareUrl = `${backendBase}/api/referrals/share/${referralData.referralCode}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Referral link copied');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Business Account" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div
                        className="relative flex flex-col items-center cursor-pointer group"
                        onClick={() => navigate('/b2b/personal-profile')}
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl shadow-primary-100 group-hover:scale-105 transition-transform">
                            <span className="text-3xl font-extrabold text-white">
                                {user?.name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-800 group-hover:text-primary-600 transition-colors">
                            {user?.name || 'User Name'}
                        </h2>
                        <p className="text-gray-500 font-medium mb-4">{user?.email || 'user@example.com'}</p>
                        <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest">
                            Verified Buyer
                        </span>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl mb-8">
                    <p className="text-xs uppercase tracking-widest text-emerald-100 font-bold mb-2">Referral Program</p>
                    <p className="text-sm font-semibold">Code: {referralData?.referralCode || 'Not available'}</p>
                    <p className="text-sm text-emerald-100 mt-1">
                        Referrals: {referralData?.referralCount || 0} | Wallet Points: {referralData?.wallet?.pointsBalance || 0}
                    </p>
                    {referralLoading && <p className="text-xs text-emerald-100 mt-2">Loading referral details...</p>}
                    {referralError && (
                        <p className="text-xs text-amber-100 mt-2">
                            {referralError}. Restart backend and refresh this page.
                        </p>
                    )}
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={copyReferralLink}
                            disabled={!referralData?.referralCode}
                            className="px-3 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiCopy /> Copy Info
                        </button>
                        <button
                            onClick={handleShareReferral}
                            disabled={!referralData?.referralCode}
                            className="px-3 py-2 rounded-xl bg-emerald-900/30 text-white text-xs font-bold flex items-center gap-2 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiShare2 /> Share
                        </button>
                    </div>
                </div>

                {/* Become a Seller Card */}
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(isVendorAuthenticated ? '/b2b-vendor/dashboard' : '/b2b/seller-selection')}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 text-white">
                                <FiBriefcase size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">
                                    {isVendorAuthenticated ? 'Vendor Dashboard' : 'Become a Seller'}
                                </h3>
                                <p className="text-xs text-primary-100 font-medium opacity-80">
                                    {isVendorAuthenticated ? 'Access your vendor panel' : 'Start selling on our platform'}
                                </p>
                            </div>
                        </div>
                        <FiArrowRight size={20} className="text-primary-200" />
                    </div>
                </motion.div>

                {/* Account Menu */}
                <div className="space-y-4">
                    {menuItems.map((item, idx) => (
                        <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => navigate(item.path)}
                            className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary-200 transition-all hover:shadow-md"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                    <item.icon size={22} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 leading-none mb-1">{item.label}</p>
                                    <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                                </div>
                            </div>
                            <FiArrowRight className="text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                        </motion.button>
                    ))}

                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={handleLogout}
                        className="w-full bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm flex items-center justify-between group hover:bg-red-100 transition-all"
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm group-hover:scale-105 transition-transform">
                                <FiLogOut size={22} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-red-600 leading-none">Log Out</p>
                                <p className="text-xs text-red-400 font-medium mt-1">Exit account</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-red-200 group-hover:translate-x-1 transition-all" />
                    </motion.button>
                    
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm flex items-center justify-between group hover:bg-red-100 transition-all mt-4"
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm group-hover:scale-105 transition-transform">
                                <FiX size={22} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-red-600 leading-none">Delete Account</p>
                                <p className="text-xs text-red-400 font-medium mt-1">Permanently remove account</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-red-200 group-hover:translate-x-1 transition-all" />
                    </motion.button>
                </div>

                {/* Quick Help Section */}
                {supportConfig && (
                    <div className="mt-8 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                            <h3 className="font-bold text-gray-800">Need Instant Help?</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <a
                                href={`tel:${supportConfig.phone}`}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                                    <FiPhoneCall size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Call</span>
                            </a>
                            <a
                                href={`mailto:${supportConfig.email}`}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                                    <FiMail size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</span>
                            </a>
                            <a
                                href={`https://wa.me/${supportConfig.whatsapp?.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">
                                    <FiMessageSquare size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">WhatsApp</span>
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Section with Social Links */}
                <div className="mt-12 text-center pb-8 px-4">
                    {supportConfig && (
                        <div className="flex items-center justify-center gap-6 mb-8">
                            {supportConfig.instagram && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-pink-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiInstagram size={24} />
                                </motion.a>
                            )}
                            {supportConfig.facebook && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.facebook} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-blue-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiFacebook size={24} />
                                </motion.a>
                            )}
                            {supportConfig.youtube && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.youtube} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-red-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiYoutube size={24} />
                                </motion.a>
                            )}
                        </div>
                    )}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                        Dealing India B2B v1.0.4<br />
                        © 2026 All Rights Reserved
                    </p>
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                                    <FiLogOut className="text-red-500 text-3xl" />
                                </div>
                                
                                <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                                    Logging Out?
                                </h3>
                                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                                    Are you sure you want to end your session? You'll need to sign in again to access your account.
                                </p>
                                
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmLogout}
                                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-[0.98]"
                                    >
                                        Yes, Log Me Out
                                    </button>
                                    <button
                                        onClick={() => setShowLogoutModal(false)}
                                        className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98]"
                                    >
                                        Stay Logged In
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                                    <FiX className="text-red-500 text-3xl" />
                                </div>
                                
                                <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                                    Delete Account?
                                </h3>
                                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                                    Are you sure you want to permanently delete your account? This action cannot be undone and you will lose all your data.
                                </p>
                                
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmDeleteAccount}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <B2BBottomNav />
        </div>
    );
};

export default Profile;
