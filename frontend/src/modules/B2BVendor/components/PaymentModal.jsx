import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCreditCard, FiLock, FiCheckCircle, FiArrowRight, FiShield, FiCalendar, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { getB2BPlanById, getB2BPlanByIdSync } from '../../../shared/utils/b2bPlanManager';

const PaymentModal = ({ isOpen, onClose, planId, onSuccess }) => {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState(1); // 1: payment details, 2: confirmation

    // Lock scroll when payment modal is open
    useScrollLock(isOpen);

    const [plan, setPlan] = useState(null);

    useEffect(() => {
        const loadPlan = async () => {
            if (planId) {
                try {
                    const planData = await getB2BPlanById(planId);
                    setPlan(planData);
                } catch (error) {
                    // Fallback to sync method
                    const planData = getB2BPlanByIdSync(planId);
                    setPlan(planData);
                }
            }
        };
        loadPlan();
    }, [planId]);

    if (!isOpen || !plan) return null;

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiry = (value) => {
        const v = value.replace(/\D/g, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const handleCardNumberChange = (e) => {
        setCardNumber(formatCardNumber(e.target.value));
    };

    const handleExpiryChange = (e) => {
        setExpiryDate(formatExpiry(e.target.value));
    };

    const handleCvvChange = (e) => {
        const v = e.target.value.replace(/\D/g, '').substring(0, 3);
        setCvv(v);
    };

    const handlePayment = async () => {
        if (!cardNumber || !cardName || !expiryDate || !cvv) {
            toast.error('Please fill all payment details');
            return;
        }

        if (cardNumber.replace(/\s/g, '').length < 16) {
            toast.error('Please enter a valid card number');
            return;
        }

        if (cvv.length < 3) {
            toast.error('Please enter a valid CVV');
            return;
        }

        setIsProcessing(true);
        
        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            setStep(2);
            toast.success('Payment processed successfully!');
            
            // After 2 seconds, call success callback
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess(plan);
                }
                handleClose();
            }, 2000);
        }, 2000);
    };

    const handleClose = () => {
        setStep(1);
        setCardNumber('');
        setCardName('');
        setExpiryDate('');
        setCvv('');
        setPaymentMethod('card');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Complete Payment</h2>
                                <p className="text-sm text-gray-500 mt-1">Secure payment powered by Razorpay</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <FiX className="text-xl text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {step === 1 ? (
                                <>
                                    {/* Plan Summary */}
                                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-6 mb-6 border-2 border-primary-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-1">{plan.name}</h3>
                                                <p className="text-sm text-gray-600">{plan.duration} Months Subscription</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-extrabold text-primary-600">
                                                    ₹{plan.price.toLocaleString('en-IN')}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">One-time payment</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method Selection */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card'
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FiCreditCard className={`text-xl ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-400'}`} />
                                                    <span className={`font-semibold ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-600'}`}>Card</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('upi')}
                                                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'upi'
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FiShield className={`text-xl ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-400'}`} />
                                                    <span className={`font-semibold ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-600'}`}>UPI</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Payment Form */}
                                    {paymentMethod === 'card' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number</label>
                                                <div className="relative">
                                                    <FiCreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={cardNumber}
                                                        onChange={handleCardNumberChange}
                                                        placeholder="1234 5678 9012 3456"
                                                        maxLength={19}
                                                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Cardholder Name</label>
                                                <div className="relative">
                                                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={cardName}
                                                        onChange={(e) => setCardName(e.target.value)}
                                                        placeholder="John Doe"
                                                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                                                    <div className="relative">
                                                        <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={expiryDate}
                                                            onChange={handleExpiryChange}
                                                            placeholder="MM/YY"
                                                            maxLength={5}
                                                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">CVV</label>
                                                    <div className="relative">
                                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={cvv}
                                                            onChange={handleCvvChange}
                                                            placeholder="123"
                                                            maxLength={3}
                                                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* UPI Payment */}
                                    {paymentMethod === 'upi' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID</label>
                                                <input
                                                    type="text"
                                                    placeholder="yourname@upi"
                                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                                />
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <p className="text-sm text-blue-800">
                                                    You will be redirected to your UPI app to complete the payment.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Security Notice */}
                                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                                        <FiShield className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800 mb-1">Secure Payment</p>
                                            <p className="text-xs text-gray-600">
                                                Your payment information is encrypted and secure. We never store your card details.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Payment Button */}
                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full mt-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Pay ₹{plan.price.toLocaleString('en-IN')}
                                                <FiArrowRight />
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                /* Success Step */
                                <div className="text-center py-12">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                    >
                                        <FiCheckCircle className="text-green-600 text-4xl" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                                    <p className="text-gray-600 mb-6">
                                        Your subscription to <span className="font-bold">{plan.name}</span> has been activated.
                                    </p>
                                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                                        <p className="text-sm text-primary-800">
                                            You will be redirected automatically...
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
