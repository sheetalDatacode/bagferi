import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiAlertCircle, FiArrowRight, FiRefreshCw, FiPlus, FiCheckCircle, FiPackage, FiCreditCard, FiX, FiHome, FiPlusCircle, FiArrowUpRight, FiInfo, FiBriefcase } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useVendorSettings } from '../hooks/useVendorSettings';
import { useSubscriptionStore } from '../store/subscriptionStore';
import subscriptionService from '../services/subscriptionService';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService';
import toast from 'react-hot-toast';
import { getMyWallet, purchaseAddonViaWallet, purchaseSubscriptionViaWallet } from '../services/vendorWalletService';

/**
 * SubscriptionGate Component
 * Wraps listing action buttons and shows appropriate state based on subscription status/addons
 */
const SubscriptionGate = ({ action, children, showLimitInfo = true, fullPage = false }) => {
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useVendorSettings();

    const {
        status,
        loading: subscriptionLoading,
        error: subscriptionError,
        fetchStatus,
        canCreateProduct,
        canCreateLotSlot,
        canCreateProperty,
        canUploadReel,
        canCreateJob,
        hasShop
    } = useSubscriptionStore();

    const [showShopModal, setShowShopModal] = useState(false);
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [addonPlans, setAddonPlans] = useState([]);
    const [basePlans, setBasePlans] = useState([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const [processingAddonId, setProcessingAddonId] = useState(null);
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [showWalletConfirmModal, setShowWalletConfirmModal] = useState(false);
    const [walletConfirmData, setWalletConfirmData] = useState(null);
    const [isRecharging, setIsRecharging] = useState(false);
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [rechargeAmountInput, setRechargeAmountInput] = useState(100);
    const [noticeData, setNoticeData] = useState(null);
    const [showNoticeModal, setShowNoticeModal] = useState(false);



    const fetchAttempted = useRef(false);
    // Hide base plans only if the user ALREADY HAS an active subscription that ALLOWS this feature
    const hideBasePlans = useMemo(() => {
        if (!status?.isActive) return false;
        
        // Check if the current plan even allows this feature type
        const limits = status?.limits?.[action === 'lotslot' ? 'lotSlot' : (action === 'product' ? 'products' : (action === 'property' ? 'properties' : action))];
        if (!limits?.allowed) return false; 
        
        return ['product', 'property', 'lotslot', 'reels', 'jobs'].includes(action);
    }, [action, status]);

    const loading = settingsLoading || subscriptionLoading;

    useEffect(() => {
        if (!status && !subscriptionLoading && !subscriptionError) {
            fetchStatus();
        }
    }, [status, subscriptionLoading, subscriptionError, fetchStatus]);

    const isModuleEnabled = () => {
        if (!settings || !settings.enabledModules) return true;
        switch (action) {
            case 'product': return settings.enabledModules.includes('product');
            case 'property': return settings.enabledModules.includes('property');
            case 'lotslot': return settings.enabledModules.includes('lotslot');
            case 'reels': return true;
            case 'jobs': return true;
            default: return true;
        }
    };

    useEffect(() => {
        const loadWallet = async () => {
            try {
                const data = await getMyWallet();
                setWalletBalance(data.balance || 0);
            } catch (e) {
                console.error('Wallet fetch failed in Gate:', e);
            }
        };
        loadWallet();
    }, []);

    const getActionTheme = () => {
        switch (action) {
            case 'property': return { color: 'indigo', icon: <FiHome /> };
            case 'product': return { color: 'blue', icon: <FiPlusCircle /> };
            case 'reels': return { color: 'rose', icon: <FiPackage /> };
            case 'lotslot': return { color: 'amber', icon: <FiPlus /> };
            case 'jobs': return { color: 'emerald', icon: <FiBriefcase /> };
            default: return { color: 'primary', icon: <FiPackage /> };
        }
    };
    const theme = getActionTheme();

    const handleFetchAddonsAndPlans = useCallback(async (silent = false) => {
        if (fetchAttempted.current) return;
        
        try {
            if (!silent) setLoadingAddons(true);
            fetchAttempted.current = true;
            
            const featureTypeMap = {
                product: 'products',
                lotslot: 'lot_slot',
                reels: 'reels',
                property: 'property',
                jobs: 'jobs'
            };

            const promises = [
                subscriptionService.getAddonPlans(featureTypeMap[action])
            ];

            if (fullPage && !hideBasePlans) {
                promises.push(subscriptionService.getPlans());
            }

            const results = await Promise.all(promises);
            const addons = results[0] || [];
            const plans = (fullPage && !hideBasePlans) ? results[1] : null;
            
            setAddonPlans(addons);
            if (plans) {
                setBasePlans(plans.filter(p => p.isActive !== false));
            }

            if (!silent) setShowAddonModal(true);
        } catch (err) {
            console.error('Fetch error in SubscriptionGate:', err);
            if (!silent) toast.error('Failed to load purchase options');
            fetchAttempted.current = false;
        } finally {
            if (!silent) setLoadingAddons(false);
            fetchAttempted.current = false;
        }
    }, [action, fullPage, hideBasePlans]);

    const handleRechargeWallet = async (amount = 100) => {
        try {
            setIsRecharging(true);
            const totalToPay = Math.round(amount * 1.18);
            toast.loading('Initializing recharge...', { id: 'wallet-gate-recharge' });

            const { initiateRecharge, verifyRecharge } = await import('../services/vendorWalletService');
            const orderData = await initiateRecharge(totalToPay);
            
            const paymentResponse = await initializeRazorpayCheckout({
                key: orderData.razorpayKeyId,
                amount: orderData.amount / 100,
                orderId: orderData.id,
                name: 'Dealing India Wallet',
                description: `Wallet Recharge: ₹${amount} + 18% GST (Total: ₹${totalToPay})`,
            });

            toast.loading('Verifying recharge...', { id: 'wallet-gate-recharge' });
            
            // Optimistic update for immediate UI feedback
            setWalletBalance(prev => prev + amount);

            const verifyData = {
                ...handlePaymentSuccess(paymentResponse),
                amount: totalToPay
            };

            await verifyRecharge(verifyData);
            
            toast.success(`Wallet recharged with ₹${amount}!`, { id: 'wallet-gate-recharge' });
            
            // Refresh balance with actual data
            const walletData = await getMyWallet();
            setWalletBalance(walletData.balance || 0);
        } catch (err) {
            console.error('Recharge error:', err);
            toast.error(err.message || 'Payment cancelled or recharge failed', { id: 'wallet-gate-recharge' });
            // Refetch to revert optimistic update if needed
            const { getMyWallet } = await import('../services/vendorWalletService');
            const walletData = await getMyWallet();
            setWalletBalance(walletData.balance || 0);
        } finally {
            setIsRecharging(false);
        }
    };

    const handleBuyAddon = async (planId, planPrice) => {
        if (processingAddonId) return;

        setShowAddonModal(false);

        // Force wallet usage for addons
        const plan = addonPlans.find(p => p._id === planId);
        if (!plan) return;

        const quantity = 1;
        const totalPrice = planPrice * quantity;

        if (walletBalance >= totalPrice) {
            setWalletConfirmData({
                id: planId,
                name: plan.name || 'Add-on Pack',
                price: totalPrice,
                quantity: 1,
                type: 'addon'
            });
            setShowWalletConfirmModal(true);
        } else {
            // Insufficient balance — show custom notice modal
            const deficit = Math.ceil(totalPrice - walletBalance);
            const rechargeAmt = Math.max(100, deficit);
            setNoticeData({
                required: totalPrice,
                balance: walletBalance,
                suggested: rechargeAmt
            });
            setShowNoticeModal(true);
        }
    };

    const handleSubscribeBase = async (planId, planPrice) => {
        if (processingPlanId) return;
        try {
            setProcessingPlanId(planId);

            // Fetch latest wallet balance first to be sure
            const currentWallet = await getMyWallet();
            const currentBalance = currentWallet.balance || 0;
            setWalletBalance(currentBalance);

            if (currentBalance >= planPrice) {
                const plan = basePlans.find(p => p._id === planId);
                setWalletConfirmData({
                    id: planId,
                    name: plan?.name || 'Subscription Plan',
                    price: planPrice,
                    type: 'subscribe'
                });
                setShowWalletConfirmModal(true);
                return;
            }

            // If insufficient wallet, we can either offer Razorpay (default) or the recharge flow
            // The user requested wallet-only for addons, but subscriptions can still use Razorpay or Wallet.
            // Let's stick to the current logic which falls back to Razorpay if wallet is insufficient
            const response = await subscriptionService.createSubscription(planId);
            const { razorpay, razorpayKeyId } = response;

            if (razorpay && razorpayKeyId) {
                const paymentResponse = await initializeRazorpayCheckout({
                    key: razorpayKeyId,
                    amount: razorpay.amount / 100,
                    orderId: razorpay.id || razorpay.orderId,
                    name: 'Dealing India B2B',
                    description: `Subscription: ${planId}`,
                });

                toast.loading('Activating subscription...', { id: 'verify-base-gate' });
                const verifyData = {
                    planId: planId,
                    ...handlePaymentSuccess(paymentResponse)
                };
                await subscriptionService.verifyPayment(verifyData);
                toast.success('Subscription activated!', { id: 'verify-base-gate' });
                await fetchStatus(true);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to activate subscription');
        } finally {
            setProcessingPlanId(null);
        }
    };

    const handleConfirmWalletPayment = async () => {
        if (!walletConfirmData) return;
        const { id, price, type } = walletConfirmData;
        
        try {
            setShowWalletConfirmModal(false);
            if (type === 'addon') {
                toast.loading('Processing wallet payment...', { id: 'wallet-gate' });
                await purchaseAddonViaWallet(id, 1);
                toast.success('Purchased successfully!', { id: 'wallet-gate' });
                setShowAddonModal(false);
            } else {
                toast.loading('Activating subscription...', { id: 'wallet-gate' });
                await purchaseSubscriptionViaWallet(id);
                toast.success('Subscription activated!', { id: 'wallet-gate' });
            }
            await fetchStatus(true);
        } catch (error) {
            toast.error(error.message || 'Wallet payment failed', { id: 'wallet-gate' });
        } finally {
            setWalletConfirmData(null);
        }
    };

    const permission = useMemo(() => {
        switch (action) {
            case 'product': return canCreateProduct();
            case 'lotslot': return canCreateLotSlot();
            case 'property': return canCreateProperty();
            case 'reels': return canUploadReel();
            case 'jobs': return canCreateJob();
            default: return { allowed: true };
        }
    }, [action, canCreateProduct, canCreateLotSlot, canCreateProperty, canUploadReel, canCreateJob, status]);

    useEffect(() => {
        if (fullPage && (!status?.isActive || !permission.allowed) && !fetchAttempted.current && !loadingAddons) {
            handleFetchAddonsAndPlans(true);
        }
    }, [fullPage, status, permission.allowed, loadingAddons, handleFetchAddonsAndPlans]);

    const renderWalletModal = () => (
        <>
            {/* Balance Notice Modal */}
            <AnimatePresence>
                {showNoticeModal && noticeData && (
                    <Modal onClose={() => setShowNoticeModal(false)}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-rose-100 rounded-[1.5rem] flex items-center justify-center text-rose-600 mx-auto mb-6">
                                <FiAlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Insufficient Balance</h3>
                            <div className="bg-rose-50 rounded-2xl p-4 mb-6 text-left space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-rose-400">Total Required:</span>
                                    <span className="text-rose-900">₹{noticeData.required}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-rose-400">Current Balance:</span>
                                    <span className="text-rose-900">₹{noticeData.balance}</span>
                                </div>
                            </div>
                            <p className="text-gray-500 mb-8 font-medium text-sm leading-relaxed">
                                You need to add funds to your wallet to proceed with this purchase. Would you like to recharge ₹{noticeData.suggested} now?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setRechargeAmountInput(noticeData.suggested);
                                        setShowNoticeModal(false);
                                        setShowRechargeModal(true);
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                    Yes, Recharge Now <FiArrowRight />
                                </button>
                                <button
                                    onClick={() => setShowNoticeModal(false)}
                                    className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Add Money Modal */}
            <AnimatePresence>
                {showRechargeModal && (
                    <Modal onClose={() => setShowRechargeModal(false)}>
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Add Money</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recharge wallet to enjoy services</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">₹</span>
                                    <input
                                        type="number"
                                        value={rechargeAmountInput}
                                        onChange={(e) => setRechargeAmountInput(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-8 pr-4 font-black text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 space-y-3">
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
                                    <span className="text-lg font-black text-indigo-600">₹{Math.round(rechargeAmountInput * 1.18).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex gap-3">
                                <FiInfo className="text-indigo-600 flex-shrink-0" size={14} />
                                <p className="text-[9px] font-bold text-indigo-700 leading-tight uppercase tracking-tight">GST is charged per regulations. Total amount includes 18% GST. Invoice will be emailed.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (rechargeAmountInput < 100) return toast.error('Min ₹100 required');
                                    setShowRechargeModal(false);
                                    await handleRechargeWallet(rechargeAmountInput);
                                }}
                                disabled={isRecharging}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                            >
                                {isRecharging ? 'Processing...' : 'Proceed to Payment'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showWalletConfirmModal && walletConfirmData && (
                    <Modal onClose={() => setShowWalletConfirmModal(false)}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-indigo-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-6">
                                <FiCreditCard size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight text-center">Confirm Wallet Pay</h3>
                            <p className="text-gray-500 mb-8 font-medium">Use your wallet balance to instantly activate this feature.</p>
                            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Item</span>
                                    <span className="font-bold text-gray-800">{walletConfirmData.name}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4 pt-4 border-t border-gray-200/50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Amount</span>
                                    <div className="text-right">
                                        <span className="font-black text-xl text-primary-600">₹{walletConfirmData.price.toLocaleString()}</span>



                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200/50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Balance After</span>
                                    <span className="font-bold text-gray-600 text-sm">₹{(walletBalance - walletConfirmData.price).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={handleConfirmWalletPayment}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <FiArrowUpRight size={20} />
                                    Confirm & Pay (₹{walletConfirmData.price})
                                </button>
                                <button
                                    onClick={() => setShowWalletConfirmModal(false)}
                                    className="w-full py-4 bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                                >
                                    Cancel Transaction
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </>
    );

    if (!isModuleEnabled()) return null;

    if (loading && !status) {
        return (
            <div className="animate-pulse flex items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <div className="text-center">
                    <FiRefreshCw className="animate-spin text-4xl text-gray-200 mx-auto mb-4" />
                    <div className="h-4 bg-gray-100 rounded w-32 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (!hasShop()) {
        const title = "Shop Listing Required";
        const message = `Please complete your shop listing first to unlock ${action} listings.`;

        if (fullPage) {
            return (
                <div className="bg-white border-2 border-dashed border-indigo-100 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto shadow-sm">
                    {renderWalletModal()}
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
                        <FiLock className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">{message}</p>
                    <button onClick={() => navigate('/b2b-vendor/shop-listing')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 mx-auto">
                        Go to Shop Listing <FiArrowRight />
                    </button>
                </div>
            );
        }

        const handleRestrictedClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowShopModal(true);
        };

        const clonedChildren = React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    onClick: handleRestrictedClick
                });
            }
            return child;
        });

        return (
            <div className="relative group">
                {renderWalletModal()}
                {clonedChildren}
                <AnimatePresence>
                    {showShopModal && (
                        <Modal onClose={() => setShowShopModal(false)}>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiPlus className="text-3xl text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                                <p className="text-gray-500 mb-6 font-medium">{message}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowShopModal(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50">Later</button>
                                    <button onClick={() => { setShowShopModal(false); navigate('/b2b-vendor/shop-listing'); }} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center gap-2">Go to Shop Listing <FiArrowRight /></button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    if (!status?.isActive && !permission.allowed) {
        const title = status?.isExpired ? "Plan Expired" : "Subscription Required";
        const message = status?.isExpired 
            ? "Your subscription plan has expired. Please renew or upgrade to continue."
            : "An active subscription plan is required to access this feature.";

        if (fullPage) {
            return (
                <div className="bg-white border-2 border-dashed border-amber-100 rounded-[2.5rem] p-8 md:p-12 text-center max-w-4xl mx-auto shadow-sm min-h-[60vh] flex flex-col items-center justify-center">
                    {renderWalletModal()}
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-6">
                        <FiLock className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h2>
                    <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">{message}</p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-2xl">
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-primary-600 uppercase tracking-[0.2em] flex items-center gap-2 justify-center lg:justify-start">
                                <FiCreditCard /> Primary Plans
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {basePlans.length > 0 ? basePlans.map(plan => (
                                    <button key={plan._id} onClick={() => handleSubscribeBase(plan._id, plan.price)} disabled={!!processingPlanId} className="flex items-center justify-between p-5 border-2 border-gray-100 rounded-[2rem] hover:border-indigo-500 hover:bg-indigo-50 transition-all group/item bg-gray-50/20">
                                        <div className="text-left">
                                            <p className="font-black text-gray-900 uppercase text-[11px] tracking-tight">{plan.name}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{plan.duration} Month Duration</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-lg text-indigo-600">₹{plan.price}</span>
                                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:border-indigo-600 transition-all shadow-sm">
                                                {processingPlanId === plan._id ? <FiRefreshCw className="animate-spin" size={18} /> : <FiArrowRight size={18} />}
                                            </div>
                                        </div>
                                    </button>
                                )) : (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                        <p className="text-gray-400 text-xs italic">Loading plans...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className={`text-xs font-black text-${theme.color}-600 uppercase tracking-[0.2em] flex items-center gap-2 justify-center lg:justify-start`}>
                                <FiPackage /> {action === 'property' ? 'Property' : (action === 'product' ? 'Product' : (action === 'reels' ? 'Reels' : (action === 'jobs' ? 'Jobs' : 'Feature')))} Add-ons
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {addonPlans.length > 0 ? addonPlans.map(plan => (
                                    <div key={plan._id} className="space-y-3">
                                        <button
                                            onClick={() => handleBuyAddon(plan._id, plan.price)}
                                            disabled={!!processingAddonId}
                                            className={`w-full flex items-center justify-between p-5 border-2 border-gray-100 rounded-[2rem] hover:border-${theme.color}-500 hover:bg-${theme.color}-50 transition-all group/item bg-gray-50/20 text-left outline-none focus:outline-none`}
                                        >
                                            <div className="text-left">
                                                <p className="font-black text-gray-900 uppercase text-[11px] tracking-tight">{plan.name}</p>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{plan.quantity} Extra Units</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                <span className={`font-black text-lg text-${theme.color}-600`}>₹{plan.price}</span>
                                                <div 
                                                    className={`w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover/item:bg-${theme.color}-600 group-hover/item:text-white group-hover/item:border-${theme.color}-600 transition-all shadow-sm`}
                                                >
                                                    {processingAddonId === plan._id ? <FiRefreshCw className="animate-spin" size={18} /> : theme.icon}
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                )) : (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                        <p className="text-gray-400 text-xs italic">
                                            {loadingAddons ? 'Loading units...' : `No ${action} add-ons available.`}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-4 mt-6 border-t border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FiCheckCircle className="text-emerald-500" /> Benefit of Add-ons
                                </h4>
                                <ul className="space-y-2">
                                    <li className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div> Pay only for what you use
                                    </li>
                                    <li className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div> No monthly commitments
                                    </li>
                                    <li className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div> Lifetime validity for units
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    if (!permission.allowed) {
        if (fullPage) {
            return (
                <div className="bg-white border-2 border-dashed border-amber-100 rounded-[2.5rem] p-8 md:p-12 text-center max-w-4xl mx-auto shadow-sm min-h-[70vh] flex flex-col items-center justify-center">
                    {renderWalletModal()}
                    <div className={`w-20 h-20 bg-${theme.color}-50 rounded-3xl flex items-center justify-center text-${theme.color}-600 mx-auto mb-6`}>
                        <FiAlertCircle className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                        {status?.isActive ? 'Limit Reached' : 'Plan Required'}
                    </h2>
                    <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed font-bold uppercase text-xs tracking-widest text-center">
                        {permission.message}
                    </p>
                    
                    <div className={`grid grid-cols-1 ${hideBasePlans ? '' : 'lg:grid-cols-2'} gap-10 w-full`}>
                        {!hideBasePlans && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-[0.2em] flex items-center gap-2 justify-center lg:justify-start">
                                    <FiCreditCard /> Primary Plans
                                </h3>
                                <div className="grid grid-cols-1 gap-3 text-left">
                                    {basePlans.length > 0 ? basePlans.map(plan => (
                                        <button key={plan._id} onClick={() => handleSubscribeBase(plan._id, plan.price)} disabled={!!processingPlanId} className="flex items-center justify-between p-5 border-2 border-gray-100 rounded-[2rem] hover:border-indigo-500 hover:bg-indigo-50 transition-all group/item bg-gray-50/20">
                                            <div className="text-left">
                                                <p className="font-black text-gray-900 uppercase text-[11px] tracking-tight">{plan.name}</p>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{plan.duration} Month Duration</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-lg text-indigo-600">₹{plan.price}</span>
                                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:border-indigo-600 transition-all shadow-sm">
                                                    {processingPlanId === plan._id ? <FiRefreshCw className="animate-spin" size={18} /> : <FiArrowRight size={18} />}
                                                </div>
                                            </div>
                                        </button>
                                    )) : !loadingAddons && (
                                        <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                            <p className="text-gray-400 text-xs italic">No plans available.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className={hideBasePlans ? "max-w-md mx-auto w-full space-y-6" : "space-y-6"}>
                            <h3 className={`text-xs font-black text-${theme.color}-600 uppercase tracking-[0.2em] flex items-center gap-2 justify-center lg:justify-start`}>
                                <FiPackage /> Add-on Packs
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {addonPlans.map(plan => {
                                    const isInsufficient = walletBalance < plan.price;
                                    return (
                                        <div key={plan._id} className="space-y-2">
                                            <button
                                         key={plan._id}
                                         onClick={() => handleBuyAddon(plan._id, plan.price)}
                                         disabled={!!processingAddonId}
                                         className={`w-full flex items-center justify-between p-5 border-2 border-gray-100 rounded-[2rem] hover:border-${theme.color}-500 hover:bg-${theme.color}-50/30 transition-all group/item bg-gray-50/20 text-left outline-none focus:outline-none mb-3`}
                                     >
                                         <div className="text-left">
                                             <p className="font-black text-gray-900 uppercase text-[11px] tracking-tight">{plan.name}</p>
                                             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{plan.quantity} Extra Units</p>
                                         </div>
                                         <div className="flex items-center gap-4 text-right">
                                             <span className={`font-black text-lg text-${theme.color}-600`}>₹{plan.price}</span>
                                             <div 
                                                 className={`w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover/item:bg-${theme.color}-600 group-hover/item:text-white group-hover/item:border-${theme.color}-600 transition-all shadow-sm`}
                                             >
                                                 {processingAddonId === plan._id || isRecharging ? <FiRefreshCw className="animate-spin" size={18} /> : (isInsufficient ? <FiPlusCircle /> : theme.icon)}
                                             </div>
                                         </div>
                                     </button>
                                            {isInsufficient && (
                                                <div className="flex items-center justify-between px-4 pb-2">
                                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter italic">Insufficient Balance (₹{walletBalance})</p>
                                                    <button 
                                                        onClick={() => handleRechargeWallet(Math.max(100, Math.ceil(plan.price - walletBalance)))}
                                                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                    >
                                                        Click here to Quick Recharge & Pay
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {addonPlans.length === 0 && !loadingAddons && (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                        <p className="text-gray-400 text-xs italic">No add-ons available for this feature. Please consider upgrading / buying units.</p>
                                    </div>
                                )}
                                {loadingAddons && <div className={`animate-spin h-8 w-8 border-4 border-${theme.color}-600 border-t-transparent rounded-full mx-auto`}></div>}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            const featureTypeMap = { product: 'products', lotslot: 'lot_slot', reels: 'reels', property: 'property', jobs: 'jobs' };
                            navigate(`/b2b-vendor/subscription?feature=${featureTypeMap[action] || action}`);
                        }} 
                        className="mt-12 text-xs font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        View Full Subscription Dashboard <FiArrowRight />
                    </button>
                </div>
            );
        }

        const handleRestrictedClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (permission.requiresAddon) {
                handleFetchAddonsAndPlans(false);
            } else {
                const featureTypeMap = { product: 'products', lotslot: 'lot_slot', reels: 'reels', property: 'property', jobs: 'jobs' };
                navigate(`/b2b-vendor/subscription?feature=${featureTypeMap[action] || action}`);
            }
        };

        const clonedChildren = React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    onClick: handleRestrictedClick
                });
            }
            return child;
        });

        return (
            <div className="relative group">
                {renderWalletModal()}
                {clonedChildren}
                
                <AnimatePresence>
                    {showAddonModal && (
                        <Modal onClose={() => setShowAddonModal(false)}>
                            <div className="text-center">
                                <div className={`w-14 h-14 bg-${theme.color}-100 rounded-2xl flex items-center justify-center text-${theme.color}-600 mx-auto mb-4`}>
                                    <FiPackage className="text-2xl" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Limit Reached</h3>
                                <p className="text-gray-500 mb-6 font-medium text-sm">{permission.message}</p>
                                
                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    {addonPlans.map(plan => (
                                        <button
                                            key={plan._id}
                                            onClick={() => handleBuyAddon(plan._id, plan.price)}
                                            disabled={!!processingAddonId}
                                            className={`w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-${theme.color}-500 hover:bg-${theme.color}-50 transition-all group/item text-left outline-none focus:outline-none`}
                                        >
                                            <div className="text-left">
                                                <p className="font-bold text-gray-800">{plan.name}</p>
                                                <p className="text-xs text-gray-500">{plan.quantity} Units</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold text-${theme.color}-600 text-sm`}>₹{plan.price}</span>
                                                <div 
                                                    className={`w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover/item:bg-${theme.color}-600 group-hover/item:text-white transition-colors`}
                                                >
                                                    {processingAddonId === plan._id ? <FiRefreshCw className="animate-spin" /> : theme.icon}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {addonPlans.length === 0 && !loadingAddons && <p className="text-gray-400 text-sm italic">No add-on packs available.</p>}
                                    {loadingAddons && <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>}
                                </div>
                                {!(hideBasePlans) && (
                                    <button onClick={() => navigate('/b2b-vendor/subscription')} className="text-sm font-bold text-indigo-600 hover:underline">Or upgrade your full subscription plan</button>
                                )}
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className={fullPage ? "w-full" : "flex items-center gap-4"}>
            {children}
            {showLimitInfo && permission.limit !== undefined && permission.limit !== -1 && !fullPage && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <span className={`font-bold ${permission.isAddon ? 'text-primary-600' : ''}`}>{permission.current}/{permission.limit}</span>
                    <span>{permission.isAddon ? 'addons used' : 'used'}</span>
                </div>
            )}
        </div>
    );
};

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX /></button>
            {children}
        </motion.div>
    </div>
);

export const SubscriptionStatusBadge = () => {
    const { status, loading, error, fetchStatus, refreshStatus } = useSubscriptionStore();
    useEffect(() => { if (!status && !loading && !error) fetchStatus(); }, [status, loading, error, fetchStatus]);
    if (loading && !status) return <div className="animate-pulse h-6 w-20 bg-gray-200 rounded-lg"></div>;
    if (!status?.hasSubscription) return <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => refreshStatus()}><FiCheckCircle size={12} className="text-emerald-500" />Verified Account</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => refreshStatus()} title="Click to refresh"><FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />{status.plan?.name || 'Active'}</span>;
};

export default SubscriptionGate;
