import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCreditCard, FiLock, FiCheckCircle, FiArrowRight, FiShield, FiCalendar, FiUser, FiArrowLeft, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getB2BPlanById, getB2BPlanByIdSync } from '../../../shared/utils/b2bPlanManager';
import api from '../../../shared/utils/api';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const PaymentPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [razorpayData, setRazorpayData] = useState(null);

    const [plan, setPlan] = useState(null);
    const [registrationData, setRegistrationData] = useState(null);
    const { setAuth } = useB2BVendorAuthStore();

    useEffect(() => {
        const storedData = sessionStorage.getItem('b2b_registration_data');
        if (!storedData) {
            toast.error('No registration data found. Please register first.');
            navigate('/b2b-vendor/register');
            return;
        }

        const data = JSON.parse(storedData);
        setRegistrationData(data);

        const loadPlan = async () => {
            if (data.subscriptionPlan) {
                try {
                    const planData = await getB2BPlanById(data.subscriptionPlan);
                    setPlan(planData);
                    
                    // Initialize Razorpay payment
                    try {
                        const paymentResponse = await api.post('/auth/b2b-vendor/initialize-payment', {
                            subscriptionPlan: data.subscriptionPlan,
                        });
                        if (paymentResponse.success && paymentResponse.data) {
                            setRazorpayData(paymentResponse.data);
                        }
                    } catch (error) {
                        console.error('Failed to initialize payment:', error);
                        toast.error('Failed to initialize payment. Please try again.');
                    }
                } catch (error) {
                    const planData = getB2BPlanByIdSync(data.subscriptionPlan);
                    setPlan(planData);
                }
            }
        };
        loadPlan();
    }, [navigate]);

    const handlePayment = async () => {
        if (!razorpayData || !razorpayData.razorpay) {
            toast.error('Payment gateway not initialized. Please refresh the page.');
            return;
        }

        setIsProcessing(true);

        try {
            await initializeRazorpayCheckout({
                key: razorpayData.razorpayKeyId,
                amount: razorpayData.plan.price,
                currency: 'INR',
                name: 'Dealing India',
                description: `B2B Vendor Registration - ${razorpayData.plan.name}`,
                orderId: razorpayData.razorpay.orderId,
                prefill: {
                    name: registrationData.name,
                    email: registrationData.email,
                    contact: registrationData.phone,
                },
                handler: async (paymentResponse) => {
                    try {
                        // Format payment data
                        const paymentData = handlePaymentSuccess(paymentResponse);

                        // Submit registration with payment verification
                        const response = await api.post('/auth/b2b-vendor/register-with-payment', {
                            ...registrationData,
                            subscriptionPlan: registrationData.subscriptionPlan,
                            paymentData: {
                                razorpayOrderId: paymentData.razorpayOrderId,
                                razorpayPaymentId: paymentData.razorpayPaymentId,
                                razorpaySignature: paymentData.razorpaySignature,
                            },
                        });

                        if (response.success && response.data) {
                            setIsProcessing(false);
                            setIsSuccess(true);
                            toast.success('Payment & Registration Successful!');
                            
                            // Store auth data
                            if (response.data.vendor && response.data.token) {
                                setAuth(response.data.vendor, response.data.token);
                            }
                            
                            sessionStorage.removeItem('b2b_registration_data');

                            setTimeout(() => {
                                navigate('/b2b-vendor/dashboard');
                            }, 2000);
                        } else {
                            throw new Error(response.message || 'Registration failed after payment');
                        }
                    } catch (error) {
                        setIsProcessing(false);
                        let errorMessage = 'Registration failed. Please contact support.';
                        
                        if (error.response?.data?.message) {
                            errorMessage = error.response.data.message;
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        // Handle specific error cases
                        if (error.response?.status === 409) {
                            errorMessage = 'Email or phone number already registered. Please use different credentials.';
                        } else if (error.response?.status === 400) {
                            errorMessage = error.response?.data?.message || 'Invalid registration data. Please check all fields.';
                        } else if (error.response?.status === 500) {
                            errorMessage = 'Server error. Please try again later or contact support.';
                        }
                        
                        toast.error(errorMessage);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        toast.error('Payment cancelled');
                    },
                },
            });
        } catch (error) {
            setIsProcessing(false);
            toast.error(error.message || 'Failed to initialize payment. Please try again.');
        }
    };

    if (!plan || !registrationData || !razorpayData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-4 text-gray-600">Initializing payment...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/b2b-vendor/register')}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors mb-8 font-semibold"
                >
                    <FiArrowLeft /> Back to Registration
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left side: Plan & Business Summary */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FiBriefcase className="text-primary-600" /> Subscription Summary
                            </h2>

                            <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 mb-6">
                                <h3 className="text-lg font-bold text-primary-900">{plan.name}</h3>
                                <p className="text-sm text-primary-700 mb-4">{plan.duration} Months Duration</p>
                                <div className="text-3xl font-black text-primary-600">
                                    ₹{plan.price.toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Business Name</span>
                                    <span className="font-bold text-gray-800">{registrationData.storeName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">GST Number</span>
                                    <span className="font-bold text-gray-800">{registrationData.gstNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Contact Email</span>
                                    <span className="font-bold text-gray-800">{registrationData.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                            <div className="flex gap-4">
                                <FiShield className="text-blue-600 text-2xl flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-blue-900 mb-1">Secure Checkout</h4>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Your payment is protected by industry-standard encryption. We prioritize your security and never store your full card details.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Payment Method */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
                        {isSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FiCheckCircle className="text-green-600 text-4xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                                <p className="text-gray-600 mb-8">Redirecting you to the verification page...</p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 3 }}
                                        className="bg-green-500 h-full"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                                    <FiCreditCard className="text-primary-600" /> Payment Details
                                </h2>

                                <div className="space-y-6">
                                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                        <div className="flex gap-4">
                                            <FiShield className="text-blue-600 text-2xl flex-shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-blue-900 mb-1">Secure Payment Gateway</h4>
                                                <p className="text-xs text-blue-700 leading-relaxed">
                                                    Your payment will be processed securely through Razorpay. You can pay using Credit/Debit cards, UPI, Net Banking, or Wallets.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>
                                                Pay ₹{plan.price.toLocaleString('en-IN')}
                                                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-2 text-gray-400">
                                        <FiLock size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">SSL Encrypted Secure Payment</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
