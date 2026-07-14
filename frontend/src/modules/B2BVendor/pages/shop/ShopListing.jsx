import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import ShopListingForm from "../../components/ShopListingForm";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { FiLock, FiArrowRight } from "react-icons/fi";

const ShopListing = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { status, loading: subLoading, fetchStatus, hasActiveSubscription, refreshStatus } = useSubscriptionStore();
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const init = async () => {
            await fetchStatus();
            setInitializing(false);
        };
        init();
    }, [fetchStatus]);

    if ((subLoading || initializing) && !status) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold mt-4 text-sm uppercase tracking-widest">Loading status...</p>
            </div>
        );
    }

    // Removed subscription gate for Shop Listing to allow vendors to set up their shop profile first.
    // Gating for products/properties will remain handled by SubscriptionGate components.

    const handleShopSubmit = async (payload) => {
        setSubmitting(true);
        try {
            const response = await api.post('/b2b-vendor/shop-units', payload, { silent: true });
            if (response.success) {
                toast.success(response.data?._id ? "Shop updated successfully!" : "Shop created successfully!");
                // Refresh subscription status to update hasShop across the app
                await refreshStatus();
                // Increment refreshKey to force re-fetch in ShopListingForm
                setRefreshKey(prev => prev + 1);
                // Stay on the same page so vendor can see updated data
            } else {
                toast.error(response.message || "Failed to save shop details");
            }
        } catch (err) {
            console.error("Error saving shop:", err);
            toast.error(err?.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >

            <ShopListingForm
                key={refreshKey}
                onSubmit={handleShopSubmit}
                isLoading={submitting}
            />
        </motion.div>
    );
};

export default ShopListing;
