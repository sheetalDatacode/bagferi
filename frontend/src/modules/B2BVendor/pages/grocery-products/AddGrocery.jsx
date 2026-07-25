import { useState } from 'react';
import { motion } from 'framer-motion';
import { useVendorSettings } from "../../hooks/useVendorSettings";
import QuotaBanner from '../../components/QuotaBanner';
import GroceryProductForm from '../../components/GroceryProductForm';

const AddGrocery = () => {
    const { loading } = useVendorSettings();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="max-w-2xl mx-auto">
                <QuotaBanner action="product" />
            </div>

            <GroceryProductForm isEdit={false} />
        </motion.div>
    );
};

export default AddGrocery;
