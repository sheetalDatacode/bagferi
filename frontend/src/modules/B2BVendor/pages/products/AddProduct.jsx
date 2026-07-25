import { useState, useEffect } from 'react';
import B2BVendorProductForm from "../../components/ProductForm";
import { motion } from 'framer-motion';
import { useVendorSettings } from "../../hooks/useVendorSettings";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import QuotaBanner from '../../components/QuotaBanner';

const AddProduct = () => {
    const { settings, loading } = useVendorSettings();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [hasShop, setHasShop] = useState(true);
    const [checkingShop, setCheckingShop] = useState(true);

    useEffect(() => {
        const checkShop = async () => {
            try {
                setCheckingShop(true);
                const shopRes = await api.get('/b2b-vendor/shop-units');
                if (!shopRes.success || !shopRes.data) {
                    setHasShop(false);
                } else {
                    setHasShop(true);
                }
            } catch (error) {
                console.error(error);
                setHasShop(false);
            } finally {
                setCheckingShop(false);
            }
        };
        checkShop();
    }, []);

    if (loading || checkingShop) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!hasShop) {
        return (
            <div className="max-w-4xl mx-auto p-6 md:p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Shop Listing Required</h3>
                <p className="text-gray-500 mb-8 max-w-md font-medium text-sm leading-relaxed">
                    You haven't listed your shop yet. You must complete your shop profile and list your shop before managing or adding products to your catalog.
                </p>
                <button
                    onClick={() => navigate('/b2b-vendor/shop-listing')}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shadow-primary-200"
                >
                    Set Up Your Shop Now
                </button>
            </div>
        );
    }

    const getTitle = () => {
        return "Add New Listing";
    };

    const getSubtitle = () => {
        return "Create a new product listing for your B2B catalog.";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
                <div className="max-w-2xl mx-auto">
                    <QuotaBanner action="product" />
                </div>


                <B2BVendorProductForm isEdit={false} />

        </motion.div>
    );
};

export default AddProduct;
