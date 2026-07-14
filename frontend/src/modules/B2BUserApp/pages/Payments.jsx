import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiPlus, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const Payments = () => {
    // Mock saved cards
    const [savedCards] = useState([
        { id: 1, type: 'Visa', last4: '4242', holder: 'Business Account', isDefault: true },
        { id: 2, type: 'Mastercard', last4: '8899', holder: 'Company Expense', isDefault: false }
    ]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Payment Methods" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Credit Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black text-white rounded-3xl p-6 shadow-xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gray-800 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Available Credit Limit</p>
                        <h2 className="text-4xl font-mono font-bold tracking-tight">₹5,00,000</h2>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Active & Verified
                        </div>
                    </div>
                </motion.div>

                {/* Saved Cards */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">Saved Cards</h3>
                        <button className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-colors">
                            <FiPlus /> Add New
                        </button>
                    </div>

                    {savedCards.map((card, idx) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary-100 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-400 text-xs italic">
                                    {card.type}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">**** **** **** {card.last4}</p>
                                    <p className="text-xs text-gray-400 font-medium uppercase">{card.holder}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {card.isDefault && (
                                    <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-md">Default</span>
                                )}
                                <button className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                    <FiTrash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bank Accounts */}
                <div className="pt-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Bank Accounts (NEFT/RTGS)</h3>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm opacity-60">
                        <p className="text-sm text-gray-500 font-medium text-center py-4">
                            You haven't added any beneficiary accounts yet.
                        </p>
                        <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-sm hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2">
                            <FiPlus /> Add Beneficiary
                        </button>
                    </div>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Payments;
