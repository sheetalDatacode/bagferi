import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiCheck, FiSmartphone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [phone, setPhone] = useState('');
    const [countryCode] = useState('+91');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!phone || phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `${countryCode}${phone}`;
            console.log('[Vendor ForgotPassword] Sending OTP to:', fullPhone);

            const response = await api.post('/auth/send-otp', {
                phoneNumber: fullPhone,
                purpose: 'password_reset'
            });

            console.log('[Vendor ForgotPassword] Response:', response);

            if (response.success) {
                const masked = `${countryCode}******${phone.slice(-4)}`;
                setMaskedPhone(masked);
                toast.success('OTP sent to your mobile number!');
                setStep(2);
            } else {
                toast.error(response.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Forgot Password Error:', error);
            const msg = error.response?.data?.message || error.message || 'Something went wrong';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `${countryCode}${phone}`;
            console.log('[Vendor ForgotPassword] Resetting password for:', fullPhone);

            const response = await api.post('/auth/vendor/reset-password-phone', {
                phoneNumber: fullPhone,
                otp,
                newPassword
            });

            console.log('[Vendor ForgotPassword] Reset Response:', response);

            if (response.success) {
                toast.success('Password reset successfully! Please login with your new password.');
                navigate('/b2b-vendor/login');
            } else {
                toast.error(response.message || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset Password Error:', error);
            const msg = error.response?.data?.message || 'Invalid OTP or expired';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => step === 2 ? setStep(1) : navigate('/b2b-vendor/login')}
                    className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 text-gray-500 rounded-full transition-colors z-10"
                >
                    <FiArrowLeft size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-50">
                        <FiLock className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-xl font-extrabold text-gray-800 mb-1">
                        {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                    </h1>
                    <p className="text-xs text-gray-500 font-medium tracking-tight px-4 mt-2">
                        {step === 1
                            ? 'Enter your mobile number to receive an OTP'
                            : `Enter the OTP sent to ${maskedPhone}`}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">Mobile Number</label>
                            <div className="flex gap-2">
                                <div className="w-16 flex items-center justify-center bg-gray-100 rounded-xl font-bold text-gray-700">
                                    +91
                                </div>
                                <div className="relative flex-1 group">
                                    <FiSmartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                        placeholder="Enter 10 digit number"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">OTP Code</label>
                            <div className="relative group">
                                <FiCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Enter 6-digit code"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium tracking-widest text-base"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">New Password</label>
                            <div className="relative group">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 ml-1">Confirm Password</label>
                            <div className="relative group">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Resetting...' : 'Set New Password'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPassword;