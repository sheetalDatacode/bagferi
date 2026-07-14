import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiPhone, FiLock, FiEye, FiEyeOff, FiBriefcase, FiShoppingBag, FiArrowLeft, FiUser } from 'react-icons/fi';

import { useAuthStore } from '../../../shared/store/authStore';
import toast from '../../../shared/utils/toast';

const B2BUserLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        identifier: location.state?.phone?.replace('+91', '') || '',
        password: '',
    });

    // Check for remembered phone
    useEffect(() => {
        const savedPhone = localStorage.getItem('remembered-b2b-user-phone');
        if (savedPhone && !location.state?.phone) {
            setFormData(prev => ({ ...prev, identifier: savedPhone }));
            setRememberMe(true);
        }
    }, [location.state]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/b2b/catalog';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.identifier || !formData.password) {
            toast.error('Please enter both identifier and password');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(formData.identifier, formData.password);
            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('remembered-b2b-user-phone', formData.identifier);
                } else {
                    localStorage.removeItem('remembered-b2b-user-phone');
                }
                toast.success('Welcome back!');
            }
        } catch (error) {
            if (error.code === 'PHONE_NOT_VERIFIED') {
                toast.error('Mobile number not verified. Sending OTP...');
                navigate('/b2b/verification', { 
                    state: { 
                        phone: error.data?.phone || formData.identifier,
                        message: 'Please verify your mobile number to login.'
                    } 
                });
            } else {
                toast.error(error.message || 'Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <div
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Login</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Access the Bulk Marketplace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Phone or Email</label>
                        <div className="relative group">
                            <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="identifier"
                                required
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder="Phone number or Email"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
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
                            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors font-bold">Remember me</span>
                        </label>
                        <Link to="/b2b/forgot-password" className="text-xs font-bold text-primary-600 hover:text-primary-700">
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div className="pt-6 border-t border-gray-100 text-center space-y-4">
                        <p className="text-xs text-gray-600 font-medium">
                            Don't have an account?{' '}
                            <Link
                                to="/b2b/register"
                                className="text-primary-600 hover:text-primary-700 font-black uppercase tracking-wider ml-1"
                            >
                                Register Now
                            </Link>
                        </p>
                        <div className="pt-2">
                            <Link
                                to="/b2b-vendor/login"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-all text-xs border border-gray-100"
                            >
                                <FiBriefcase /> Login as Vendor
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div >
    );
};

export default B2BUserLogin;
