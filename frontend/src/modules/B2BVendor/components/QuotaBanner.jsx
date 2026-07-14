import React from 'react';
import { motion } from 'framer-motion';
import { FiInfo, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../store/subscriptionStore';

/**
 * QuotaBanner Component
 * Shows a premium usage indicator for a specific feature (reels, products, etc.)
 */
const QuotaBanner = ({ action, className = "" }) => {
    const navigate = useNavigate();
    const { status, canCreateProduct, canCreateLotSlot, canCreateProperty, canUploadReel } = useSubscriptionStore();

    if (!status) return null;

    let permission = null;
    let title = "";

    switch (action) {
        case 'product':
            permission = canCreateProduct();
            title = "Product Listing";
            break;
        case 'lotslot':
            permission = canCreateLotSlot();
            title = "Lot/Slot Listing";
            break;
        case 'property':
            permission = canCreateProperty();
            title = "Property Listing";
            break;
        case 'reels':
            permission = canUploadReel();
            title = "Reel Upload";
            break;
        default:
            return null;
    }

    const { current = 0, limit = 0, remaining = 0 } = permission || {};
    const isUnlimited = limit === -1;
    const hasLimitInfo = limit !== undefined && current !== undefined;

    if (!hasLimitInfo && !isUnlimited) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-2 bg-gray-100 rounded w-full" />
            </div>
        );
    }

    const isExhausted = !isUnlimited && !permission.allowed;
    const percentage = isUnlimited ? 0 : (isExhausted ? 100 : (limit > 0 ? Math.min(100, (current / limit) * 100) : 0));
    const isLow = !isUnlimited && remaining <= (limit * 0.2) && remaining > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-6 ${className}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isExhausted ? 'bg-red-50 text-red-600' : isLow ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600'}`}>
                        <FiInfo className="text-xl" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{title} Quota</h4>
                        <p className="text-xs text-gray-500">
                            {isUnlimited ? (
                                "Unlimited listings available with your plan"
                            ) : isExhausted ? (
                                <span className="text-red-600 font-bold">Limit reached. Please upgrade to continue.</span>
                            ) : (
                                <span className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider border border-indigo-100 shadow-sm">
                                        {remaining === -1 ? 'Unlimited' : `${remaining} ${action === 'reels' ? 'Reels' : 'Units'} Remaining`}
                                    </span>
                                    <span className="text-gray-400 font-medium whitespace-nowrap">Total Capacity: {limit} units</span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {!isUnlimited && (
                    <div className="flex-1 max-w-xs">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Usage Status</span>
                            <span className={`text-[10px] font-bold ${isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-primary-600'}`}>
                                {Math.round(percentage)}% Used
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                    isExhausted ? 'bg-gradient-to-r from-red-500 to-rose-600' : 
                                    isLow ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                                    'bg-gradient-to-r from-primary-500 to-indigo-600'
                                }`}
                            />
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => navigate(`/b2b-vendor/subscription?feature=${action}`)}
                    className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors py-1 px-2 rounded-lg hover:bg-primary-50"
                >
                    View Plan <FiChevronRight />
                </button>
            </div>
        </motion.div>
    );
};

export default QuotaBanner;
