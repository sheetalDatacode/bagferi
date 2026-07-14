import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiBriefcase, FiArrowLeft, FiShoppingBag, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import toast from '../../../shared/utils/toast';

const B2BVendorLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, loading: storeLoading } = useB2BVendorAuthStore();

    const [formData, setFormData] = useState({
        identifier: location.state?.phone?.replace('+91', '') || '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/b2b-vendor/dashboard';
            navigate(from, { replace: true });
        }

        if (location.state?.message) {
            toast.success(location.state.message, {
                duration: 6000,
            });
        }
    }, [navigate, location, isAuthenticated]);

    useEffect(() => {
        const savedPhone = localStorage.getItem('remembered-b2b-vendor-phone');
        if (savedPhone && !location.state?.phone) {
            setFormData(prev => ({ ...prev, identifier: savedPhone }));
            setRememberMe(true);
        }
    }, [location.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.identifier || !formData.password) {
            toast.error('Please enter both identifier and password');
            return;
        }

        setLocalLoading(true);
        try {
            const result = await login(formData.identifier, formData.password);
            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('remembered-b2b-vendor-phone', formData.identifier);
                } else {
                    localStorage.removeItem('remembered-b2b-vendor-phone');
                }
                toast.success('Welcome back!');
            } else {
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            console.log('[Login] Error caught:', error.message);

            // Check if it's a phone not verified error
            if (error.message === 'Phone not verified' || error.code === 'PHONE_NOT_VERIFIED') {
                const phone = error.data?.phone || formData.identifier;
                const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
                toast.error('Mobile number not verified. Please verify your phone number.', { duration: 5000 });
                navigate('/b2b-vendor/verification', {
                    state: {
                        phone: formattedPhone,
                        message: 'Please verify your mobile number to complete login.'
                    }
                });
            } else {
                toast.error(error.message || 'An unexpected error occurred');
            }
        } finally {
            setLocalLoading(false);
        }
    };

    const isButtonLoading = localLoading || storeLoading;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative"
            >
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <FiBriefcase className="text-white text-xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Vendor Login</h1>
                    <p className="text-sm text-gray-500 font-medium">Access your B2B vendor portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Phone or Email</label>
                        <div className="relative group">
                            <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="identifier"
                                required
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder="Phone number or Email"
                                className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors font-bold">Remember me</span>
                        </label>
                        <Link to="/b2b-vendor/forgot-password" className="text-xs font-bold text-primary-500 hover:text-primary-400">
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isButtonLoading}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-bold text-base hover:from-primary-700 hover:to-primary-600 shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                        {isButtonLoading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div className="pt-6 border-t border-gray-100 text-center space-y-4">
                        <p className="text-xs text-gray-500 font-medium">
                            Don't have a vendor account?{' '}
                            <Link
                                to="/b2b-vendor/register"
                                className="text-primary-500 hover:text-primary-400 font-black uppercase tracking-wider ml-1"
                            >
                                Register Now
                            </Link>
                        </p>
                        <div className="pt-2">
                            <Link
                                to="/b2b/login"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-all text-xs border border-gray-200"
                            >
                                <FiShoppingBag /> Login as Buyer
                            </Link>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorLogin;
;
