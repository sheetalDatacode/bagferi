import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCheck, FiStar, FiInfo, FiCreditCard, FiCheckCircle,
    FiRefreshCw, FiX, FiCalendar, FiAlertTriangle, FiClock,
    FiDollarSign, FiPackage, FiShield, FiExternalLink, FiPlusCircle, FiGrid,
    FiArrowRight, FiArrowUpRight, FiHome, FiAlertCircle, FiBriefcase
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getActiveB2BPlans, getB2BPlanByIdSync } from '../../../shared/utils/b2bPlanManager';
import api from '../../../shared/utils/api';
import subscriptionService from '../services/subscriptionService';
import { useRef } from 'react';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService'; // Added import
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { getBusinessTypes } from '../../../shared/utils/businessTypeCache';
import { getB2BPlanById } from '../../../shared/utils/b2bPlanManager';
import { useSubscriptionStore } from '../store/subscriptionStore';
import vendorWalletService from '../services/vendorWalletService';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';

const B2BVendorSubscription = () => {
    const { vendor } = useB2BVendorAuthStore();
    const { refreshStatus } = useSubscriptionStore();
    const [availablePlans, setAvailablePlans] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState([]);
    const [addonHistory, setAddonHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingSubscription, setCancellingSubscription] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Addon State
    const [availableAddons, setAvailableAddons] = useState([]);
    const [addonBalance, setAddonBalance] = useState([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const [processingAddonId, setProcessingAddonId] = useState(null);




    // Payment Confirmation Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [payModalData, setPayModalData] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isWalletProcessing, setIsWalletProcessing] = useState(false);
    const [isRecharging, setIsRecharging] = useState(false);
    const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
    const [rechargeAmountInput, setRechargeAmountInput] = useState(100);

    // Lock scroll when any modal is open
    useScrollLock(showCancelModal || showDetailsModal || showPayModal || showAddMoneyModal);

    // Sync modal visibility with browser history for hardware/browser back buttons
    useEffect(() => {
        const handlePopState = (e) => {
            setShowPayModal(false);
            setShowCancelModal(false);
            setShowDetailsModal(false);
            setShowAddMoneyModal(false);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const isAnyModalOpen = showPayModal || showCancelModal || showDetailsModal || showAddMoneyModal;
        if (isAnyModalOpen) {
            if (window.history.state?.modal !== 'open') {
                window.history.pushState({ modal: 'open' }, '');
            }
        } else {
            if (window.history.state?.modal === 'open') {
                window.history.back();
            }
        }
    }, [showPayModal, showCancelModal, showDetailsModal, showAddMoneyModal]);

    useEffect(() => {
        loadSubscriptionData();
        loadAddonData();
        loadWalletData();

        // Handle URL search params for filtering
        const params = new URLSearchParams(window.location.search);
        const feature = params.get('feature');
        if (feature) {
            // Scroll to addons section if filtering by feature
            setTimeout(() => {
                const element = document.getElementById('addon-packs');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, []);


    const isFetchingRef = useRef(false);

    const loadSubscriptionData = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            setLoading(true);

            // Parallelize all initial data fetching - Force refresh for business types too
            const [businessTypes, subscriptions] = await Promise.all([
                getBusinessTypes(true),
                subscriptionService.getAllSubscriptions()
            ]);

            // Find vendor's business type and its settings
            const vendorBusinessType = businessTypes.find(t =>
                (t._id && vendor?.businessTypeRef && t._id.toString() === vendor.businessTypeRef.toString()) ||
                (t.slug && vendor?.businessType && t.slug.toString().toLowerCase() === vendor.businessType.toString().toLowerCase()) ||
                (t.name && vendor?.businessType && t.name.toString().toLowerCase() === vendor.businessType.toString().toLowerCase())
            );

            // Use ID if available, fallback to slug
            const bTypeFilter = vendorBusinessType?._id || vendorBusinessType?.slug;

            // Now fetch the plans for this business type - Force refresh from API
            const marketPlans = await getActiveB2BPlans(true, { businessType: bTypeFilter });
            
            // Apply strict filtering based on configuration settings
            const allowedPlansConfig = vendorBusinessType?.settings?.allowedPlans || [];
            
            const filteredPlans = marketPlans
                .filter(p => {
                    const planId = p._id || p.id;
                    // If the configuration specifies allowed plans, strictly follow it
                    if (allowedPlansConfig.length > 0) {
                        return allowedPlansConfig.includes(planId);
                    }
                    // If allowedPlans is an empty array [] (explicitly restricted), allow none
                    if (vendorBusinessType?.settings && Array.isArray(vendorBusinessType.settings.allowedPlans) && vendorBusinessType.settings.allowedPlans.length === 0) {
                        return false;
                    }
                    // Default fallback (legacy or unconfigured)
                    return [3, 6, 12].includes(p.duration);
                })
                .sort((a, b) => a.duration - b.duration);

            setAvailablePlans(filteredPlans);

            const activeSub = subscriptions.find(s => s.status === 'active') ||
                subscriptions.find(s => s.status === 'pending') ||
                subscriptions.find(s => s.status === 'cancelled');

            if (activeSub) {
                // Handle populated vs unpopulated planId
                const pid = activeSub.planId?._id || activeSub.planId;
                
                // Try to find in current market plans first
                let planDetails = marketPlans.find(p => (p._id || p.id) === pid);
                
                // If not found (legacy or different type), fetch directly by ID
                if (!planDetails) {
                    try {
                        planDetails = await getB2BPlanById(pid);
                    } catch (e) {
                        console.warn('Could not fetch specific plan details', e);
                    }
                }

                setCurrentSubscription({ ...activeSub, planDetails });
            } else {
                setCurrentSubscription(null);
            }

            setSubscriptionHistory(subscriptions);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load subscription data');
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    const loadWalletData = async () => {
        try {
            const data = await vendorWalletService.getMyWallet();
            setWalletBalance(data.balance || 0);
        } catch (err) {
            console.error('Error loading wallet:', err);
        }
    };

    const loadAddonData = async () => {
        try {
            setLoadingAddons(true);
            const [plans, status, history] = await Promise.all([
                subscriptionService.getAddonPlans(),
                subscriptionService.getAddonStatus(),
                subscriptionService.getAddonHistory()
            ]);
            setAvailableAddons(plans);
            setAddonBalance(status || []);
            setAddonHistory(history || []);
        } catch (err) {
            console.error('Error loading addons:', err);
        } finally {
            setLoadingAddons(false);
        }
    };
    const getPlanRank = (name) => {
        const n = String(name || '').toLowerCase();
        if (n.includes('gold')) return 5;
        if (n.includes('premium')) return 4;
        if (n.includes('diamond')) return 3;
        if (n.includes('silver')) return 2;
        if (n.includes('basic')) return 1;
        return 0;
    };

    const handleUpgrade = async (planId) => {
        if (processingPlanId) return;

        const plan = availablePlans.find(p => (p._id || p.id) === planId);
        if (!plan) return;

        try {
            setProcessingPlanId(planId);
            toast.loading('Calculating upgrade price...', { id: 'upgrade-init' });

            const response = await subscriptionService.initializeUpgrade(planId);
            const {
                finalAmount,
                unusedCredit,
                remainingDays,
                usedDays,
                netBase,
                gstAmount,
                newPlanPrice,
                oldPlanPrice,
            } = response;

            setPayModalData({
                id: planId,
                name: plan.name,
                type: 'upgrade',
                // Proration fields
                oldPlanPrice: oldPlanPrice || 0,
                newPlanPrice: newPlanPrice || plan.price,
                unusedCredit: unusedCredit || 0,
                remainingDays: remainingDays || 0,
                usedDays: usedDays || 0,
                // Final amounts
                basePrice: netBase || 0,          // net base (after credit)
                gstAmount: gstAmount || 0,
                totalAmount: finalAmount || 0,
                gstPercentage: plan.gst || 18,
                upgradeDetails: response
            });
            setShowPayModal(true);
        } catch (error) {
            console.error('Upgrade initialization error:', error);
            toast.error(error.message || 'Failed to calculate upgrade price');
        } finally {
            toast.dismiss('upgrade-init');
            setProcessingPlanId(null);
        }
    };

    const proceedWithUpgrade = async (planId) => {
        const upgradeData = payModalData?.upgradeDetails;
        if (!upgradeData) return;

        setShowPayModal(false);
        try {
            setProcessingPlanId(planId);
            const { razorpay, razorpayKeyId, finalAmount } = upgradeData;

            if (razorpay && razorpayKeyId) {
                try {
                    const paymentResponse = await initializeRazorpayCheckout({
                        key: razorpayKeyId,
                        amount: razorpay.amount / 100,
                        orderId: razorpay.id || razorpay.orderId,
                        name: 'Dealing India B2B Upgrade',
                        description: `Upgrade to ${planId}`,
                    });

                    toast.loading('Activating upgrade...', { id: 'verify-upgrade' });

                    const verifyData = {
                        planId: planId,
                        ...handlePaymentSuccess(paymentResponse),
                        amount: finalAmount
                    };

                    await subscriptionService.verifyUpgradePayment(verifyData);
                    await refreshStatus(); // Force global status update

                    toast.success('Subscription upgraded successfully!', { id: 'verify-upgrade' });
                    loadSubscriptionData();
                } catch (err) {
                    console.error('Upgrade Payment Error:', err);
                    toast.error(err.message || 'Upgrade payment failed');
                }
            } else if (finalAmount === 0) {
                toast.success('Upgraded successfully!');
                loadSubscriptionData();
            }

        } catch (error) {
            console.error('Upgrade error:', error);
            toast.error(error.message || 'Failed to initialize upgrade');
        } finally {
            setProcessingPlanId(null);
        }
    };

    const handleSubscribe = async (planId) => {
        if (processingPlanId) return;

        const plan = availablePlans.find(p => (p._id || p.id) === planId);
        if (!plan) return;

        // Initial GST calculation for display (dynamic at interaction time)
        const discountAmount = plan.discount || 0;
        const gstPercentage = plan.gst || 18;
        const priceAfterDiscount = Math.max(0, plan.price - discountAmount);
        const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
        const totalAmount = priceAfterDiscount + gstAmount;

        setPayModalData({
            id: planId,
            name: plan.name,
            originalPrice: plan.price,
            basePrice: plan.price,
            discount: discountAmount,
            gstPercentage: gstPercentage,
            gstAmount: gstAmount,
            totalAmount: totalAmount,
            type: 'subscribe'
        });
        setShowPayModal(true);
    };

    const proceedWithSubscription = async (planId) => {
        setShowPayModal(false);
        try {
            setProcessingPlanId(planId);

            // Create subscription initialization
            const response = await subscriptionService.createSubscription(planId);
            const { subscription, razorpay, razorpayKeyId } = response;

            // Handle Razorpay Modal if provided (standard flow now)
            if (razorpay && razorpayKeyId) {
                try {
                    const paymentResponse = await initializeRazorpayCheckout({
                        key: razorpayKeyId,
                        amount: razorpay.amount / 100, // API returns paise, service expects rupees
                        orderId: razorpay.id || razorpay.orderId,
                        name: 'Dealing India B2B',
                        description: `Subscription: ${planId}`,
                        prefill: {
                            // You could add vendor details here if available
                        }
                    });

                    // After successful payment modal
                    toast.loading('Verifying payment...', { id: 'verify-payment' });

                    const verifyData = {
                        planId: planId, // Using planId
                        ...handlePaymentSuccess(paymentResponse)
                    };

                    await subscriptionService.verifyPayment(verifyData);
                    await refreshStatus(); // Force global status update

                    toast.success('Subscription activated successfully!', { id: 'verify-payment' });
                    loadSubscriptionData();
                } catch (err) {
                    console.error('Payment Modal Error:', err);
                    toast.error(err.message || 'Payment cancelled or failed');
                }
                return;
            }

            // Legacy URL redirection (if still used)
            if (subscription?.razorpaySubscriptionUrl) {
                toast.success('Redirecting to payment page...');
                window.open(subscription.razorpaySubscriptionUrl, '_blank');
                setTimeout(() => {
                    loadSubscriptionData();
                    refreshStatus();
                }, 2000);
            } else if (subscription?.status === 'active') {
                // Free plan activated
                await refreshStatus(); // Force global status update
                toast.success('Subscription activated successfully!');
                loadSubscriptionData();
            } else {
                toast.info('Subscription recorded. Please complete payment.');
                loadSubscriptionData();
            }

        } catch (error) {
            console.error('Subscription error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to create subscription');
        } finally {
            setProcessingPlanId(null);
        }
    };

    const handleBuyAddon = async (planId) => {
        if (processingAddonId) return;

        const addon = availableAddons.find(a => (a._id || a.id) === planId);
        if (!addon) return;

        const quantity = 1;
        const discountAmount = (addon.discount || 0) * quantity;
        const priceAfterDiscount = Math.max(0, (addon.price * quantity) - discountAmount);
        
        // No GST for addons at purchase time (collected at recharge)
        const gstPercentage = 0;
        const gstAmount = 0;
        const totalAmount = priceAfterDiscount;

        setPayModalData({
            id: planId,
            name: addon.name,
            quantity: quantity,
            originalPrice: addon.price * quantity,
            basePrice: addon.price * quantity,
            discount: discountAmount,
            gstPercentage: gstPercentage,
            gstAmount: gstAmount,
            totalAmount: totalAmount,
            type: 'addon'
        });
        setShowPayModal(true);
    };

    const proceedWithAddonPurchase = async (planId) => {
        const quantity = 1;
        setShowPayModal(false);
        try {
            setProcessingAddonId(planId);
            toast.loading('Initializing purchase...', { id: 'addon-init' });

            const response = await subscriptionService.initializeAddonPurchase(planId, quantity);
            const { order, key } = response;

            toast.dismiss('addon-init');

            if (order && key) {
                const paymentResponse = await initializeRazorpayCheckout({
                    key: key,
                    amount: order.amount / 100,
                    orderId: order.id,
                    name: 'Dealing India Add-on',
                    description: `Purchase Extra Feature Units`,
                });

                toast.loading('Verifying purchase...', { id: 'verify-addon' });

                const verifyData = {
                    planId: planId,
                    ...handlePaymentSuccess(paymentResponse)
                };

                await subscriptionService.verifyAddonPayment(verifyData);

                toast.success('Add-on purchased successfully!', { id: 'verify-addon' });
                loadAddonData();
                refreshStatus(); // Also refresh global subscription status
            }
        } catch (error) {
            console.error('Addon purchase error:', error);
            toast.error(error.message || 'Failed to purchase add-on');
        } finally {
            setProcessingAddonId(null);
        }
    };

    const handleRechargeAndPay = async (amount = 100) => {
        try {
            setIsRecharging(true);
            const totalToPay = Math.round(amount * 1.18);
            toast.loading('Initializing recharge...', { id: 'wallet-recharge' });

            const orderData = await vendorWalletService.initiateRecharge(totalToPay);
            
            const paymentResponse = await initializeRazorpayCheckout({
                key: orderData.razorpayKeyId,
                amount: orderData.amount / 100,
                orderId: orderData.id,
                name: 'Dealing India Wallet',
                description: `Wallet Recharge: ₹${amount} + 18% GST (Total: ₹${totalToPay})`,
            });

            toast.loading('Verifying recharge...', { id: 'wallet-recharge' });

            // Optimistic update for immediate feedback
            setWalletBalance(prev => prev + amount);

            const verifyData = {
                ...handlePaymentSuccess(paymentResponse),
                amount: totalToPay
            };

            await vendorWalletService.verifyRecharge(verifyData);
            
            toast.success(`Wallet recharged with ₹${amount}!`, { id: 'wallet-recharge' });
            
            // Refresh balance
            await loadWalletData();
        } catch (err) {
            console.error('Recharge error:', err);
            toast.error(err.message || 'Payment cancelled or recharge failed', { id: 'wallet-recharge' });
            await loadWalletData(); // Refetch to revert optimistic update
        } finally {
            setIsRecharging(false);
        }
    };

    const proceedWithWalletPayment = async () => {
        const { id, type } = payModalData;
        try {
            setIsWalletProcessing(true);
            toast.loading('Processing wallet payment...', { id: 'wallet-pay' });
            
            if (type === 'addon') {
                await vendorWalletService.purchaseAddonViaWallet(id, 1);
            } else {
                // For both 'subscribe' and 'upgrade', we use the same wallet endpoint
                await api.post('/vendor/subscriptions/purchase-wallet', { planId: id });
            }
            
            toast.success('Payment successful via wallet!', { id: 'wallet-pay' });
            setShowPayModal(false);
            
            if (type === 'addon') loadAddonData();
            else loadSubscriptionData();
            
            loadWalletData();
            refreshStatus();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Wallet payment failed', { id: 'wallet-pay' });
        } finally {
            setIsWalletProcessing(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!currentSubscription || cancellingSubscription) return;

        try {
            setCancellingSubscription(true);

            await subscriptionService.cancelSubscription(currentSubscription._id);

            toast.success('Subscription cancelled successfully');
            setShowCancelModal(false);
            loadSubscriptionData();

        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to cancel subscription');
        } finally {
            setCancellingSubscription(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-700',
            cancelled: 'bg-red-100 text-red-700',
            expired: 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getPlanIcon = (duration) => {
        if (duration === 12) return <FiStar className="text-2xl" />;
        if (duration === 6) return <FiPackage className="text-2xl" />;
        return <FiShield className="text-2xl" />;
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading subscription data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="mb-8 flex justify-end">
                <button
                    onClick={loadSubscriptionData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-bold text-sm uppercase tracking-wider shadow-sm"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    Refresh Status
                </button>
            </div>

            {/* Current Subscription Card */}
            {currentSubscription && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

                    <div className="relative z-10">
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                        <FiCheckCircle className="text-2xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Current Subscription</h2>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${currentSubscription.status === 'active'
                                            ? 'bg-green-400/30 text-green-100'
                                            : 'bg-yellow-400/30 text-yellow-100'
                                            }`}>
                                            {currentSubscription.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiPackage className="text-sm" />
                                            Plan
                                        </div>
                                        <p className="text-xl font-bold">
                                            {currentSubscription.planDetails?.name || `${currentSubscription.planDetails?.duration || 'N/A'} Months`}
                                        </p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiDollarSign className="text-sm" />
                                            Amount Paid
                                        </div>
                                        <p className="text-xl font-bold">
                                            ₹{(currentSubscription.finalPayableAmount || currentSubscription.planDetails?.price || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiCalendar className="text-sm" />
                                            Started On
                                        </div>
                                        <p className="text-xl font-bold">
                                            {formatDate(currentSubscription.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setShowDetailsModal(true)}
                                    className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2"
                                >
                                    <FiInfo />
                                    View Details
                                </button>

                                {currentSubscription.status === 'active' && (
                                    <button
                                        onClick={() => setShowCancelModal(true)}
                                        className="px-6 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
                                    >
                                        <FiX />
                                        Cancel Subscription
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Pending Payment Notice */}
            {subscriptionHistory.some(sub => sub.status === 'pending') && !currentSubscription && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8 flex items-start gap-4"
                >
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiClock className="text-yellow-600 text-xl" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-yellow-800 mb-1">Pending Payment</h3>
                        <p className="text-yellow-700">
                            You have a pending subscription. Please complete the payment to activate your subscription.
                        </p>
                        {subscriptionHistory.find(sub => sub.status === 'pending')?.razorpaySubscriptionUrl && (
                            <a
                                href={subscriptionHistory.find(sub => sub.status === 'pending').razorpaySubscriptionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                            >
                                Complete Payment
                                <FiExternalLink />
                            </a>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Available Plans Section */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {currentSubscription ? 'Available Plans' : 'Choose a Subscription Plan'}
                </h2>
                <p className="text-gray-500">
                    {currentSubscription
                        ? 'Explore other plans for when your current subscription expires.'
                        : 'Select a plan to access the B2B marketplace and start selling.'}
                </p>
            </div>

            {availablePlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">

                    {availablePlans.map((plan, index) => {
                    const planId = plan._id || plan.id;
                    const currentPlanId = currentSubscription?.planId?._id || currentSubscription?.planId;
                    const isCurrentPlan = currentPlanId?.toString() === planId?.toString();
                    const hasActiveSubscription = currentSubscription?.status === 'active';
                    const isPendingPlan = currentSubscription?.status === 'pending' && isCurrentPlan;
                    
                    const isProcessing = processingPlanId === planId;
                    const isRecommended = plan.duration === 6;

                    const planRank = getPlanRank(plan.name);
                    const currentRank = getPlanRank(currentSubscription?.planDetails?.name);
                    const isUpgrade = hasActiveSubscription && planRank > currentRank;
                    const isDowngrade = hasActiveSubscription && planRank < currentRank;

                    return (
                        <motion.div
                            key={planId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={!hasActiveSubscription || isCurrentPlan || isUpgrade ? { y: -8, scale: 1.02 } : {}}
                            className={`relative bg-white rounded-3xl p-8 shadow-lg border-2 flex flex-col transition-all ${isCurrentPlan
                                ? 'border-green-500 ring-4 ring-green-50'
                                : isRecommended
                                    ? 'border-primary-500 ring-4 ring-primary-50'
                                    : 'border-gray-100 hover:border-gray-200'
                                } ${isDowngrade ? 'opacity-60' : ''}`}
                        >
                            {/* Badges */}
                            {isCurrentPlan && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                    CURRENT PLAN
                                </div>
                            )}
                            {isUpgrade && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                    UPGRADE AVAILABLE
                                </div>
                            )}
                            {isRecommended && !isCurrentPlan && !isUpgrade && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                    RECOMMENDED
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isCurrentPlan
                                    ? 'bg-green-100 text-green-600'
                                    : isUpgrade || isRecommended
                                        ? 'bg-primary-100 text-primary-600 shadow-lg shadow-primary-100'
                                        : 'bg-slate-100 text-gray-500'
                                    }`}>
                                    {getPlanIcon(plan.duration)}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                                {plan.discount > 0 ? (
                                    <div className="space-y-2 mb-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Original</span>
                                                <span className="text-base font-bold text-gray-300 line-through decoration-red-400/50 decoration-2">
                                                    ₹{plan.price?.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-4xl font-black text-primary-600 tracking-tighter">
                                                    ₹{(plan.price - plan.discount).toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-sm font-bold text-gray-400 lowercase">
                                                    /{plan.duration === 12 ? 'yr' : plan.duration + 'mo'}
                                                </span>
                                                <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-green-100">
                                                    Save ₹{plan.discount?.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-extrabold text-gray-900">
                                                ₹{plan.price?.toLocaleString('en-IN') || '0'}
                                            </span>
                                            <span className="text-sm font-bold text-gray-400 lowercase">
                                                /{plan.duration === 12 ? 'yr' : plan.duration + 'mo'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {plan.duration} Months Duration
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8 flex-grow">
                                {plan.features?.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                                        <div className={`mt-1 p-1 rounded-full ${isCurrentPlan || isRecommended || isUpgrade
                                            ? 'bg-primary-100 text-primary-600'
                                            : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            <FiCheck className="text-xs" />
                                        </div>
                                        <span className="text-sm font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Action Button */}
                            {isCurrentPlan && hasActiveSubscription ? (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-2xl font-bold bg-green-600 text-white cursor-not-allowed"
                                >
                                    Current Plan
                                </button>
                            ) : isPendingPlan ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleSubscribe(planId)} // Retries purchase flow
                                        className="w-full py-4 rounded-2xl font-bold bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg shadow-yellow-100 flex items-center justify-center gap-2"
                                    >
                                        <FiClock />
                                        Complete Payment
                                    </button>
                                    <p className="text-xs text-center text-yellow-600">
                                        Subscription is waiting for payment
                                    </p>
                                </div>
                            ) : isUpgrade ? (
                                <button
                                    onClick={() => handleUpgrade(planId)}
                                    disabled={isProcessing}
                                    className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing
                                        ? 'bg-gray-400 text-white cursor-wait'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl shadow-blue-200'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiRefreshCw />
                                            Upgrade Now
                                        </>
                                    )}
                                </button>
                            ) : isDowngrade ? (
                                <div className="space-y-2">
                                    <button
                                        disabled
                                        className="w-full py-4 rounded-2xl font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
                                    >
                                        Downgrade Blocked
                                    </button>
                                    <p className="text-xs text-center text-gray-500">
                                        You can change plan after expiry
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(planId)}
                                    disabled={isProcessing}
                                    className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing
                                        ? 'bg-gray-400 text-white cursor-wait'
                                        : isRecommended
                                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-xl shadow-primary-200'
                                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiCreditCard />
                                            Subscribe Now
                                        </>
                                    )}
                                </button>
                            )}
                        </motion.div>
                    );
                })}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] p-16 shadow-lg border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center mb-10 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary-50/30 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-50/20 rounded-full -ml-16 -mb-16 transition-transform group-hover:scale-125 duration-700"></div>
                    
                    <div className="w-24 h-24 bg-primary-50 text-primary-600 rounded-[2rem] flex items-center justify-center mb-8 relative z-10 shadow-sm border border-primary-100">
                        <FiPackage className="text-5xl" />
                    </div>
                    
                    <h3 className="text-3xl font-black text-gray-900 mb-4 relative z-10">No Subscription Plans Configured</h3>
                    <p className="text-gray-500 max-w-lg mx-auto mb-1 relative z-10 leading-relaxed font-medium">
                        Your business type (<span className="font-black text-primary-600 uppercase bg-primary-50 px-3 py-1 rounded-lg border border-primary-100">{vendor?.businessType || 'N/A'}</span>) currently doesn't require a monthly subscription.
                    </p>
                    <p className="text-gray-400 max-w-xl mx-auto mb-10 relative z-10 leading-relaxed text-sm">
                        You can still <span className="font-black text-gray-700">list your shop</span> for free and purchase individual <span className="font-black text-gray-700">Feature Packs</span> (Products, Reels, etc.) from the section below using your wallet balance.
                    </p>

                    
                    <div className="flex flex-col items-center gap-4 relative z-10">
                        <button 
                            onClick={() => {
                                const element = document.getElementById('addon-packs');
                                if (element) element.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-3 px-8 py-3 bg-primary-600 rounded-2xl text-sm font-bold text-white shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all"
                        >
                            <FiPlusCircle className="text-lg" /> Explore Add-on Packs
                        </button>
                    </div>
                </div>
            )}


            {/* Add-on Packs Section */}
            <div className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Extra Feature Power-Ups</h2>
                        <p className="text-gray-600 text-lg">Running low on units? Purchase one-time add-on packs to keep your marketplace activity growing.</p>
                    </div>
                    {addonBalance && addonBalance.length > 0 && (
                        <div className="bg-white border-2 border-primary-50 rounded-[2rem] p-6 shadow-xl shadow-primary-50/50 flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex -space-x-4">
                                {addonBalance.map((b, i) => (
                                    <div key={b._id} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white relative z-[${10-i}] ${
                                        b._id === 'reels' ? 'bg-rose-500 text-white' : 
                                        b._id === 'products' ? 'bg-blue-500 text-white' : 
                                        'bg-amber-500 text-white'
                                    }`}>
                                        {b._id === 'reels' ? <FiPackage /> : b._id === 'products' ? <FiPlusCircle /> : b._id === 'property' ? <FiHome /> : <FiGrid />}
                                    </div>
                                ))}
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Current Add-on Inventory</p>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                                    {addonBalance.map(b => (
                                        <div key={b._id} className="flex flex-col">
                                            <span className="text-lg font-black text-gray-900 leading-none">
                                                {b.totalAvailable} <span className="text-xs font-bold text-gray-400 capitalize">{b._id}</span>
                                            </span>
                                            <span className="text-[9px] text-primary-600 font-bold uppercase mt-1">Available for use</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loadingAddons ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16 px-2 sm:px-0 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-gray-100 h-64 rounded-3xl"></div>
                        ))}
                    </div>
                ) : availableAddons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 px-2 sm:px-0" id="addon-packs">

                    {availableAddons
                        .filter(addon => {
                            const params = new URLSearchParams(window.location.search);
                            const featureFilter = params.get('feature');
                            return !featureFilter || addon.featureType === featureFilter;
                        })
                        .map((addon) => (
                            <motion.div
                                key={addon._id}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="bg-white rounded-[2.5rem] p-8 shadow-xl border-2 border-gray-50 flex flex-col items-center text-center relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
                                
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 relative z-10 font-bold ${
                                    addon.featureType === 'reels' ? 'bg-rose-50 text-rose-600' : 
                                    addon.featureType === 'products' ? 'bg-blue-50 text-blue-600' : 
                                    addon.featureType === 'property' ? 'bg-indigo-50 text-indigo-600' :
                                    addon.featureType === 'jobs' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-amber-50 text-amber-600'
                                }`}>
                                    {addon.featureType === 'reels' ? <FiPackage className="text-3xl" /> : 
                                     addon.featureType === 'products' ? <FiPlusCircle className="text-3xl" /> : 
                                     addon.featureType === 'property' ? <FiHome className="text-3xl" /> :
                                     addon.featureType === 'jobs' ? <FiBriefcase className="text-3xl" /> :
                                     <FiGrid className="text-3xl" />}
                                </div>

                                <h4 className="text-xl font-black text-gray-900 mb-1">{addon.name}</h4>
                                <p className="text-xs text-gray-400 mb-6 font-black uppercase tracking-[0.2em]">{addon.featureType}</p>
                                
                                <div className="mb-6 w-full p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-3xl font-black text-gray-900">₹{addon.price.toLocaleString('en-IN')}</span>
                                    <p className="text-[10px] text-primary-600 font-black mt-2 bg-primary-100/50 py-1.5 px-4 rounded-full uppercase">
                                        {addon.quantity} {addon.featureType} Units
                                    </p>
                                </div>


                                <button
                                    onClick={() => handleBuyAddon(addon._id)}
                                    disabled={processingAddonId === addon._id}
                                    className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                                        processingAddonId === addon._id 
                                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                                        : 'bg-gray-900 text-white hover:bg-black hover:shadow-2xl shadow-gray-200'
                                    }`}
                                >
                                    {processingAddonId === addon._id ? (
                                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FiCreditCard className="text-xl" />
                                            Get Pack
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-100 text-gray-400">
                            <FiPackage className="text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Add-ons Available Right Now</h3>
                        <p className="text-gray-500 mb-6">We couldn't find any feature packs matching your business type: <span className="font-bold text-primary-600 uppercase">{vendor?.businessType || 'N/A'}</span></p>
                        <div className="flex flex-col items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-xl text-xs font-bold text-gray-400 border border-gray-200 shadow-sm">
                                <FiInfo className="text-primary-500" /> Administrative configuration required for this role.
                            </div>
                            <p className="text-[10px] text-gray-300 font-mono">
                                System Role Slug: { (vendor?.businessType || 'textile').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Addon Purchase History */}
            {addonHistory && addonHistory.length > 0 && (
                <div className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 shadow-inner">
                            <FiClock />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-navy-900 uppercase tracking-tight">Recent Add-on Activity</h3>
                            <p className="text-gray-400 text-xs font-medium">Tracking your successful marketplace boosts</p>
                        </div>
                    </div>
                    
                    <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center hidden md:table-cell">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {addonHistory.map((item) => (
                                        <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0 ${
                                                        item.featureType === 'reels' ? 'bg-rose-100 text-rose-600' :
                                                        item.featureType === 'products' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                        {item.featureType === 'reels' ? <FiPackage /> : item.featureType === 'products' ? <FiPlusCircle /> : item.featureType === 'property' ? <FiHome /> : <FiGrid />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                                                            {item.addonPlanId?.name || 'Custom Pack'}
                                                            {item.purchasedPacks > 1 && ` (x${item.purchasedPacks})`}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Feature: {item.featureType?.replace('_', ' ')}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter md:hidden">• {formatDate(item.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center hidden md:table-cell">
                                                <span className="text-sm font-bold text-gray-500 tabular-nums whitespace-nowrap">{formatDate(item.createdAt)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                    item.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                                                    item.status === 'consumed' ? 'bg-slate-100 text-slate-400' : 
                                                    'bg-rose-100 text-rose-600 shadow-sm'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-gray-900 text-sm tabular-nums whitespace-nowrap">₹{(item.totalAmount || item.addonPlanId?.price || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
 
            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl flex-shrink-0 shadow-lg shadow-blue-200">
                    <FiInfo />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-xl font-bold text-blue-900 mb-2">Important Notice for B2B Vendors</h4>
                    <p className="text-blue-800 leading-relaxed">
                        B2B subscriptions are required for listing products in the bulk marketplace.
                        Your store profile will be visible to retailers once your subscription is active
                        and documents are verified by our team.
                    </p>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAlertTriangle className="text-red-600 text-3xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Cancel Subscription?</h3>
                                <p className="text-gray-600">
                                    Are you sure you want to cancel your subscription? You will lose access to B2B marketplace features.
                                </p>
                            </div>

                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                                <ul className="text-sm text-red-800 space-y-2">
                                    <li>• Your products will be hidden from buyers</li>
                                    <li>• You won't receive new inquiries</li>
                                    <li>• No refund for remaining period</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="flex-1 h-12 flex items-center justify-center bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Keep Subscription
                                </button>
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={cancellingSubscription}
                                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {cancellingSubscription ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                                            <span>Cancelling...</span>
                                        </>
                                    ) : (
                                        <span>Yes, Cancel</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subscription Details Modal */}
            <AnimatePresence>
                {showDetailsModal && currentSubscription && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
                                <h2 className="text-2xl font-bold text-gray-800">Subscription Details</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <FiX className="text-xl text-gray-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(currentSubscription.status)}`}>
                                        {currentSubscription.status?.toUpperCase()}
                                    </span>
                                </div>

                                {/* Plan Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Plan Name</p>
                                        <p className="font-bold text-gray-800">
                                            {currentSubscription.planDetails?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Duration</p>
                                        <p className="font-bold text-gray-800">
                                            {currentSubscription.planDetails?.duration || 'N/A'} Months
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                                        <p className="font-bold text-gray-800">
                                            ₹{(currentSubscription.finalPayableAmount || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Subscription Date</p>
                                        <p className="font-bold text-gray-800">
                                            {formatDate(currentSubscription.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                {/* Razorpay Details */}
                                {currentSubscription.razorpaySubscriptionId && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-sm text-blue-600 font-medium mb-2">Payment Details</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Subscription ID</span>
                                                <span className="font-mono text-sm text-gray-800">
                                                    {currentSubscription.razorpaySubscriptionId}
                                                </span>
                                            </div>
                                            {currentSubscription.subscriptionDetails?.current_start && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Billing Start</span>
                                                    <span className="font-medium text-gray-800">
                                                        {formatDate(new Date(currentSubscription.subscriptionDetails.current_start * 1000))}
                                                    </span>
                                                </div>
                                            )}
                                            {currentSubscription.subscriptionDetails?.current_end && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Billing End</span>
                                                    <span className="font-medium text-gray-800">
                                                        {formatDate(new Date(currentSubscription.subscriptionDetails.current_end * 1000))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Features */}
                                {currentSubscription.planDetails?.features && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-3 font-medium">Included Features</p>
                                        <ul className="space-y-2">
                                            {currentSubscription.planDetails.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3 text-gray-700">
                                                    <FiCheck className="text-green-500" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Confirmation Modal */}
            <AnimatePresence>
                {showPayModal && payModalData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPayModal(false)}
                            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="bg-primary-600 p-8 text-white relative flex-shrink-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                <button 
                                    onClick={() => setShowPayModal(false)}
                                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                                
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Confirm Payment</h3>
                                <p className="text-primary-100 font-medium opacity-80">Final breakdown before checkout</p>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                                <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Selected Item</span>
                                            <span className="text-xl font-bold text-gray-900">
                                                {payModalData.name}
                                            </span>
                                        </div>
                                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                            <FiCreditCard size={24} />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-200/60">
                                        {payModalData.type === 'upgrade' ? (
                                            // === UPGRADE BREAKDOWN ===
                                            <>
                                                {/* Full new plan price */}
                                                <div className="flex justify-between text-gray-600 font-medium">
                                                    <span>{payModalData.name} (Full Price)</span>
                                                    <span>₹{(payModalData.newPlanPrice || 0).toLocaleString('en-IN')}</span>
                                                </div>

                                                {/* Credit from old plan */}
                                                {payModalData.unusedCredit > 0 && (
                                                    <div className="flex justify-between font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100/50 text-emerald-700">
                                                        <div className="flex items-center gap-1.5">
                                                            <FiCheckCircle size={14} />
                                                            <div>
                                                                <span>Credit from Current Plan</span>
                                                                <p className="text-[10px] font-normal text-emerald-600">{payModalData.remainingDays} unused days</p>
                                                            </div>
                                                        </div>
                                                        <span>- ₹{payModalData.unusedCredit.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}

                                                {/* Divider + Net base */}
                                                <div className="flex justify-between text-gray-700 font-semibold bg-gray-100 px-3 py-2 rounded-xl">
                                                    <span>Net Base (After Credit)</span>
                                                    <span>₹{(payModalData.basePrice || 0).toLocaleString('en-IN')}</span>
                                                </div>

                                                {/* GST on net base only */}
                                                <div className="flex justify-between text-gray-600 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span>GST ({payModalData.gstPercentage || 18}% on Net Base)</span>
                                                    </div>
                                                    <span>+ ₹{(payModalData.gstAmount || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        ) : (
                                            // === REGULAR SUBSCRIPTION / ADDON BREAKDOWN ===
                                            <>
                                                <div className="flex justify-between text-gray-600 font-medium">
                                                    <span>Base Price {payModalData.quantity > 1 ? `(₹${(payModalData.basePrice/payModalData.quantity).toLocaleString()} x ${payModalData.quantity})` : ''}</span>
                                                    <span>₹{(payModalData.basePrice || payModalData.originalPrice || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                {payModalData.discount > 0 && (
                                                    <div className="flex justify-between text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100/50">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>Special Discount</span>
                                                        </div>
                                                        <span>- ₹{payModalData.discount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {payModalData.gstAmount > 0 && (
                                                    <div className="flex justify-between text-gray-600 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span>GST ({payModalData.gstPercentage || 18}%)</span>
                                                            <div className="group relative">
                                                                <FiInfo size={14} className="text-gray-400" />
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                                    Goods and Services Tax as per Government regulations
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span>+ ₹{(payModalData.gstAmount || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Wallet Special Price</p>
                                                <p className="text-sm font-bold text-indigo-700">No GST Applied</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-black text-indigo-600">
                                                    ₹{((payModalData.basePrice || 0) - (payModalData.discount || 0)).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-10 px-2">
                                    <span className="text-lg font-black text-gray-900 uppercase">Total Amount</span>
                                    <span className="text-3xl font-black text-primary-600">
                                        ₹{(payModalData.totalAmount || 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                {payModalData.type !== 'addon' && (
                                    <button
                                        onClick={() => {
                                            if (payModalData.type === 'subscribe') proceedWithSubscription(payModalData.id);
                                            if (payModalData.type === 'upgrade') proceedWithUpgrade(payModalData.id);
                                        }}
                                        className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-95 mb-3"
                                    >
                                        Proceed To Pay
                                        <FiArrowRight size={20} />
                                    </button>
                                )}

                                {walletBalance < ((payModalData.basePrice || 0) - (payModalData.discount || 0)) ? (
                                    <div className="space-y-4">
                                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                                                    <FiAlertCircle />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Insufficient Balance</p>
                                                    <p className="text-[10px] text-rose-600 font-bold">Your current balance is ₹{walletBalance.toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                {[100, 500, 1000].map(amt => (
                                                    <button 
                                                        key={amt}
                                                        onClick={() => handleRechargeAndPay(amt)}
                                                        disabled={isRecharging}
                                                        className="py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        + ₹{amt}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    const deficit = Math.max(100, Math.ceil(((payModalData.basePrice || 0) - (payModalData.discount || 0)) - walletBalance));
                                                    setRechargeAmountInput(deficit);
                                                    setShowAddMoneyModal(true);
                                                }}
                                                className="w-full py-4 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95"
                                            >
                                                <FiPlusCircle size={18} />
                                                Add Money to Wallet
                                            </button>
                                        </div>
                                        <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                            GST is collected only during recharge.<br/>Add-on units are billed at base price from wallet.
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={proceedWithWalletPayment}
                                        disabled={isWalletProcessing}
                                        className="w-full py-5 rounded-2xl font-black text-sm bg-indigo-50 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-indigo-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FiArrowUpRight size={22} />
                                            <div className="text-left">
                                                <p className="leading-none mb-0.5">Pay with Wallet</p>
                                                <p className="text-[10px] font-bold opacity-80">Current: ₹{walletBalance.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </button>
                                )}
                                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8">
                                    Trusted & Secured Payment Interface
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Add Money / Recharge Modal */}
            <AnimatePresence>
                {showAddMoneyModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10001] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden mx-4"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setShowAddMoneyModal(false)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-full transition-colors"
                            >
                                <FiX size={18} />
                            </button>

                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Add Money</h3>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Recharge your wallet to enjoy platform services</p>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                                {/* Amount Input Box */}
                                <div>
                                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 block px-1">Amount (₹)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-indigo-200">₹</div>
                                        <input
                                            type="number"
                                            value={rechargeAmountInput}
                                            onChange={(e) => setRechargeAmountInput(Math.max(0, parseInt(e.target.value) || 0))}
                                            placeholder="Enter amount (Min ₹100)"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl py-4 sm:py-6 pl-12 sm:pl-14 pr-4 sm:pr-6 text-xl sm:text-2xl font-black text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-200"
                                        />
                                    </div>
                                </div>

                                {/* Quick Select Buttons */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[100, 500, 1000, 2000, 5000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setRechargeAmountInput(amt)}
                                            className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all border ${
                                                rechargeAmountInput === amt 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                                            }`}
                                        >
                                            +₹{amt}
                                        </button>
                                    ))}
                                </div>

                                 {/* GST Breakdown Box */}
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-5 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest">Base Amount</span>
                                        <span className="text-slate-900">₹{rechargeAmountInput.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest">GST (18%)</span>
                                        <span className="text-indigo-600">+₹{Math.round(rechargeAmountInput * 0.18).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-tighter">Total Payable</span>
                                        <span className="text-xl sm:text-2xl font-black text-indigo-600">₹{Math.round(rechargeAmountInput * 1.18).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex gap-3 sm:gap-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600 rounded-xl sm:rounded-2xl flex-shrink-0 flex items-center justify-center">
                                        <FiInfo size={16} />
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600/80 leading-relaxed uppercase tracking-tight">
                                        The recharge amount will be added to your spendable balance. Total payable includes 18% GST as per government regulations. Official invoice will be emailed.
                                    </p>
                                </div>

                                {/* Proceed Button */}
                                <button
                                    onClick={() => {
                                        if (rechargeAmountInput < 100) {
                                            toast.error('Minimum recharge amount is ₹100');
                                            return;
                                        }
                                        handleRechargeAndPay(rechargeAmountInput);
                                        setShowAddMoneyModal(false);
                                    }}
                                    disabled={isRecharging}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isRecharging ? (
                                        <FiRefreshCw className="animate-spin" />
                                    ) : (
                                        <>
                                            Proceed to Payment
                                            <FiArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BVendorSubscription;
