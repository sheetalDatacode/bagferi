import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiPhone, FiLock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../shared/store/authStore';

const B2BVendorVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [codes, setCodes] = useState(['', '', '', '', '', '']); // 6 digit OTP
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(30);
    const inputRefs = useRef([]);
    const { verifyOTP, sendOTP } = useAuthStore();

    const phone = location.state?.phone;

    useEffect(() => {
        if (!phone) {
            toast.error('Session expired. Please register again.');
            navigate('/b2b-vendor/register');
        }
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [phone, navigate]);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleChange = (index, value) => {
        const cleanedValue = value.trim();
        if (!cleanedValue) {
            const newCodes = [...codes];
            newCodes[index] = '';
            setCodes(newCodes);
            return;
        }

        if (cleanedValue.length > 1) {
            const pasteData = cleanedValue.slice(0, 6);
            if (!/^\d+$/.test(pasteData)) return;

            const newCodes = [...codes];
            pasteData.split('').forEach((char, i) => {
                if (index + i < 6) newCodes[index + i] = char;
            });
            setCodes(newCodes);
            
            const nextIndex = Math.min(index + pasteData.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        if (!/^\d+$/.test(cleanedValue)) return;
        
        const newCodes = [...codes];
        newCodes[index] = cleanedValue;
        setCodes(newCodes);
        
        if (index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!codes[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
        if (!/^\d+$/.test(pasteData)) return;

        const newCodes = [...codes];
        pasteData.split('').forEach((char, index) => {
            if (index < 6) newCodes[index] = char;
        });
        setCodes(newCodes);

        const focusIndex = Math.min(pasteData.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otp = codes.join('');
        if (otp.length !== 6) return;

        setIsLoading(true);
        try {
            const result = await verifyOTP(phone, otp);
            if (result.success) {
                toast.success('Mobile verified successfully! You can now login. Your account is subject to admin approval.', {
                    duration: 5000
                });
                // Clear session storage data
                sessionStorage.removeItem('b2b_registration_data');
                sessionStorage.removeItem('b2b_registration_license');
                sessionStorage.removeItem('b2b_registration_pan');

                // Redirect to login page with success message
                navigate('/b2b-vendor/login', {
                    state: {
                        phone: phone.replace('+91', ''),
                        message: 'Mobile verified! Please login with your email and password. Your account may be subject to admin approval.'
                    },
                    replace: true
                });
            }
        } catch (error) {
            toast.error(error.message || 'Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        try {
            const result = await sendOTP(phone);
            if (result.success) {
                toast.success('Verification code resent successfully');
                setCooldown(30);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to resend code');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => navigate('/b2b-vendor/register')}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                    title="Go Back"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiLock className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800 mb-2">Vendor Verification</h1>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed px-4">
                        We've sent a 6-digit code to <br />
                        <span className="font-bold text-primary-600 text-base">{phone}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-center gap-2.5">
                        {codes.map((code, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                value={code}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                maxLength={1}
                                className="w-10 h-12 text-center text-xl font-black bg-gray-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white text-gray-800 transition-all shadow-sm"
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            type="submit"
                            disabled={isLoading || codes.some(code => !code)}
                            className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98]"
                        >
                            {isLoading ? 'Verifying...' : <><FiCheck className="text-lg" /> Verify & Continue</>}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={cooldown > 0}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 disabled:text-gray-400 transition-colors uppercase tracking-wider"
                            >
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive? Resend Code"}
                            </button>
                        </div>
                    </div>

                    <div className="text-center pt-4 border-t border-gray-100">
                        <Link to="/b2b-vendor/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider">
                            <FiArrowLeft /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorVerification;
