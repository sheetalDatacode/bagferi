import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiShoppingBag, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const SellerTypeSelection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const [isChecking, setIsChecking] = useState(false);

    // Check if we already have an intention/type from navigation state
    useEffect(() => {
        if (!user) {
            navigate('/app/login');
        }
    }, [user, navigate]);

    const handleVendorTypeSelection = async (vendorType) => {
        if (useB2BVendorAuthStore.getState().isAuthenticated) {
            navigate('/b2b-vendor/dashboard');
            return;
        }

        if (!user?.email) {
            toast.error('User email not found');
            return;
        }

        setIsChecking(true);

        try {
            // Check if vendor exists and is approved
            const response = await api.get(`/auth/vendor/check-status/${user.email}`);

            if (response.success && response.data) {
                const { exists, isApproved, vendorType: existingVendorType, status } = response.data;

                // Only check for B2B vendor type
                if (vendorType !== 'b2b') {
                    toast.error('Only B2B vendor registration is available');
                    return;
                }

                // Case 1: Existing B2B Vendor
                if (exists && existingVendorType === 'b2b') {
                    if (isApproved) {
                        toast.success('B2B Vendor account exists. Please login.');

                        // FORCE LOGOUT to ensure login page is shown
                        useB2BVendorAuthStore.getState().logout();
                        navigate('/b2b-vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true,
                                message: 'Please login to access your B2B Vendor dashboard'
                            }
                        });
                        return;
                    }

                    if (status === 'pending') {
                        toast.success('Your B2B vendor account is pending admin approval.');
                        useB2BVendorAuthStore.getState().logout();
                        navigate('/b2b-vendor/login', {
                            state: { email: user.email, autoFill: true }
                        });
                        return;
                    }
                }

                // Case 2: Vendor of different type exists - not supported
                if (exists && existingVendorType !== 'b2b') {
                    toast.error('You have a different vendor account type. Please contact support.');
                    navigate('/b2b/landing');
                    return;
                }
            }

            // Case 3: No vendor account exists - Register new B2B vendor
            navigate('/b2b-vendor/register', {
                state: {
                    userData: user,
                    isUpgrade: true
                }
            });
        } catch (error) {
            console.error('Error checking vendor status:', error);
            toast.error('Failed to check vendor status. Please try again.');
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Become a Seller" showBack={true} />

            <main className="max-w-md mx-auto px-4 py-8 mt-4">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Account Type</h2>
                    <p className="text-gray-500">Select the type of seller account that fits your business needs.</p>
                </div>

                <div className="space-y-4">
                    {/* B2B Vendor Option */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVendorTypeSelection('b2b')}
                        disabled={isChecking}
                        className="w-full relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-800 transition-all group text-left"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiBriefcase className="w-24 h-24 text-slate-800" />
                        </div>

                        <div className="relative z-10 flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <FiBriefcase className="text-2xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">B2B Vendor</h3>
                                <p className="text-sm text-gray-500 mb-3">Wholesale & bulk business</p>
                                <ul className="space-y-1">
                                    <li className="flex items-center text-xs text-gray-600">
                                        <FiCheckCircle className="text-green-500 mr-2" />
                                        Bulk orders & pricing
                                    </li>
                                    <li className="flex items-center text-xs text-gray-600">
                                        <FiCheckCircle className="text-green-500 mr-2" />
                                        Business verification required
                                    </li>
                                    <li className="flex items-center text-xs text-gray-600">
                                        <FiCheckCircle className="text-green-500 mr-2" />
                                        Minimum order quantities
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.button>
                </div>

                {isChecking && (
                    <div className="mt-8 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                        <p className="text-sm">Processing request...</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SellerTypeSelection;
