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
        <div className="flex min-h-screen w-full bg-white">
            {/* Left side Image (Hidden on small screens) */}
            <div className="hidden lg:flex flex-col justify-end w-1/2 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618221195710-dd6b14666f27?q=80&w=2000&auto=format&fit=crop')" }}>
            <div className="absolute inset-0 bg-primary-900/70 mix-blend-multiply"></div>
                <div className="relative z-10 p-12 lg:p-20 text-white">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-bold tracking-widest mb-6 uppercase">
                        Premium B2B Marketplace
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-extrabold mb-4 leading-tight">
                        Sign in to your <br />
                        <span className="text-primary-400">Bagferi account</span>
                    </h1>
                    <p className="text-lg text-gray-200 max-w-md">
                        Access saved addresses, order tracking, wishlist items, and faster checkout.
                    </p>
                </div>
            </div>

            {/* Right side Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 p-2 text-gray-400 hover:text-primary-600 bg-gray-50 rounded-full transition-colors z-10 hidden lg:block"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="flex justify-center items-center mb-4">
                             <img src="/bagferi-logo.png" alt="Bagferi Logo" className="h-16 w-auto object-contain" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">Email or Phone</label>
                            <input
                                type="text"
                                name="identifier"
                                required
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder="user1@gmail.com"
                                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium text-sm outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium text-sm outline-none pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
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
                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-blue-50/50"
                                />
                                <span className="text-xs text-gray-500 group-hover:text-gray-800 transition-colors font-bold">Remember Me</span>
                            </label>
                            <Link to="/b2b/forgot-password" className="text-xs font-bold text-primary-600 hover:text-primary-700">
                                Forgot?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {isLoading ? 'SIGNING IN...' : 'LOGIN'}
                        </button>
                        
                        <div className="pt-4 text-left">
                            <Link
                                to="/b2b/register"
                                className="text-primary-600 hover:text-primary-700 font-bold text-sm tracking-wide opacity-80 hover:opacity-100"
                            >
                                Create Account
                            </Link>
                        </div>
                    </form>
                    
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-8 flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors text-sm font-medium lg:hidden"
                    >
                        <FiArrowLeft /> Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default B2BUserLogin;
