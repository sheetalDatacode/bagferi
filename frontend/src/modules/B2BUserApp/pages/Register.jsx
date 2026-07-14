import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiBriefcase, FiMapPin, FiArrowLeft, FiCheck, FiTag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';

const B2BUserRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { register } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem('b2b_user_register_draft');
        let initialData = {
            name: '',
            businessName: '',
            email: '',
            phone: location.state?.phone ? location.state.phone.replace('+91', '') : '',
            password: '',
            address: {
                city: '',
            },
            referralCode: new URLSearchParams(location.search).get('ref') || '',
            agreedToTerms: false
        };

        if (saved && !location.state?.phone) {
            try {
                return { ...initialData, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to parse draft', e);
            }
        }
        return initialData;
    });

    useEffect(() => {
        localStorage.setItem('b2b_user_register_draft', JSON.stringify(formData));
    }, [formData]);
    const referralCode = new URLSearchParams(location.search).get('ref') || '';

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Custom filtering for Name and Phone
        if (name === 'name') {
            const alphaValue = value.replace(/[^a-zA-Z\s]/g, '').slice(0, 50);
            setFormData(prev => ({ ...prev, [name]: alphaValue }));
            return;
        }

        if (name === 'phone') {
            const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            return;
        }

        if (name === 'email') {
            const lowerEmail = value.toLowerCase().trim();
            setFormData(prev => ({ ...prev, [name]: lowerEmail }));
            return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            let cleanedValue = value;

            // Alphabet filtering for City
            if (child === 'city') {
                cleanedValue = value.replace(/[^a-zA-Z\s]/g, '');
            }

            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: cleanedValue }
            }));
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: '' }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // 1. Full Name Validation: Alphabets only
        if (!formData.name.trim()) {
            newErrors.name = 'Full Name is required';
        } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
            newErrors.name = 'Name should only contain alphabets';
        }

        // Business Name Validation
        if (!formData.businessName.trim()) {
            newErrors.businessName = 'Business Name is required';
        } else if (!/[a-zA-Z0-9]/.test(formData.businessName)) {
            newErrors.businessName = 'Business Name must contain at least one letter or number';
        }

        // 2. Business Email Validation: Optional
        if (formData.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/;
            if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Enter a valid email (e.g., name@company.com)';
            }
        }

        // 3. Phone Number Validation: Exactly 10 digits
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone Number is required';
        } else if (formData.phone.length !== 10) {
            newErrors.phone = 'Phone number must be 10 digits';
        }

        // 4. Password
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        // 5. City
        if (!formData.address.city.trim()) {
            newErrors['address.city'] = 'City is required';
        }

        // 6. Terms Agreement
        if (!formData.agreedToTerms) {
            newErrors.agreedToTerms = 'You must agree to the Terms & Conditions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                businessInfo: {
                    companyName: formData.businessName,
                    address: {
                        city: formData.address.city,
                    }
                },
                userType: 'b2b'
            };

            const result = await register(
                payload.name,
                payload.email,
                payload.password,
                payload.phone,
                payload.userType,
                payload.businessInfo,
                formData.referralCode,
                formData.agreedToTerms
            );

            if (result.success) {
                if (result.otpSent) {
                    toast.success('Registration successful! Please verify your mobile number.');
                    navigate('/b2b/verification', { 
                        state: { 
                            phone: result.phone, 
                            email: formData.email 
                        },
                        replace: true 
                    });
                } else {
                    localStorage.removeItem('b2b_user_register_draft');
                    toast.success('Registration successful! Welcome to Dealing India.');
                    navigate('/b2b/catalog', { replace: true });
                }
            } else {
                toast.error(result.message || 'Registration failed');
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                    title="Go Back"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Registration</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Join as a Verified Business Buyer</p>
                </div>
                {referralCode && (
                    <div className="mb-4 px-4 py-2 rounded-xl bg-green-50 border border-green-100 text-xs font-semibold text-green-700 text-center">
                        Referral applied: {referralCode}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Information */}
                    <div className="md:col-span-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-2 px-1">Contact Information</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Full Name</label>
                        <div className="relative group">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                maxLength={50}
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${errors.name ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                        </div>
                        {errors.name && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Business Name</label>
                        <div className="relative group">
                            <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                placeholder="Example Corp"
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${errors.businessName ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                        </div>
                        {errors.businessName && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.businessName}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Business Email</label>
                        <div className="relative group">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@business.com"
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${errors.email ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                        </div>
                        {errors.email && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Phone Number</label>
                        <div className="relative group">
                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="tel"
                                name="phone"
                                readOnly={!!location.state?.phone}
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="9876543210"
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${
                                    location.state?.phone ? 'opacity-70 cursor-not-allowed' : ''
                                } ${errors.phone ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                        </div>
                        {errors.phone && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${errors.password ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary-500 ${errors.password ? 'text-rose-400' : 'text-gray-400'}`}
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.password}</p>}
                    </div>

                    <div className="md:col-span-2 space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-gray-700 ml-1">City</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="address.city"
                                value={formData.address.city}
                                onChange={handleChange}
                                placeholder="Surat"
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 rounded-xl transition-all font-medium text-sm ${errors['address.city'] ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-transparent focus:border-primary-500 focus:bg-white'
                                    }`}
                            />
                        </div>
                        {errors['address.city'] && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors['address.city']}</p>}
                    </div>

                    <div className="md:col-span-2 space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-gray-700 ml-1">Referral Code (Optional)</label>
                        <div className="relative group">
                            <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="referralCode"
                                value={formData.referralCode}
                                onChange={handleChange}
                                placeholder="Enter Referral Code"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-xl transition-all font-medium text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1 px-1">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    name="agreedToTerms"
                                    checked={formData.agreedToTerms}
                                    onChange={handleChange}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-gray-300 transition-all checked:border-primary-600 checked:bg-primary-600 focus:outline-none"
                                />
                                <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none text-[10px]" />
                            </div>
                            <span className="text-xs text-gray-600 leading-tight">
                                I agree to the <Link to="/terms?type=user" className="text-primary-600 font-bold hover:underline">Terms & Conditions</Link> and <Link to="/user-privacy-policy" className="text-primary-600 font-bold hover:underline">Privacy Policy</Link>
                            </span>
                        </label>
                        {errors.agreedToTerms && <p className="text-rose-500 text-[10px] ml-7 font-bold">{errors.agreedToTerms}</p>}
                    </div>

                    <div className="md:col-span-2 pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Account...' : 'Register as Business Buyer'}
                        </button>
                    </div>

                    <div className="md:col-span-2 pt-3 border-t border-gray-100 flex flex-col items-center gap-2">
                        <Link to="/app/login" className="text-xs text-gray-500 font-medium hover:text-primary-600 transition-colors">
                            Back to Retail Marketplace
                        </Link>
                        <p className="text-center text-xs text-gray-500 font-medium">
                            Already have an account?{' '}
                            <Link to="/b2b/login" className="text-primary-600 font-bold hover:underline">
                                Sign In here
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BUserRegister;
