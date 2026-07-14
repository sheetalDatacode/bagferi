import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiFileText, FiShield } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupportConfig } from '../services/supportService';

const TermsAndConditions = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'user'; // 'user' or 'vendor'
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) {
                    if (type === 'vendor') {
                        setContent(res.data.vendorTermsAndConditions || 'Terms and Conditions for vendors are being updated.');
                    } else {
                        setContent(res.data.userTermsAndConditions || 'Terms and Conditions for users are being updated.');
                    }
                }
            } catch (error) {
                console.error('Failed to load terms:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [type]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <FiChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 capitalize">
                        {type} Terms & Conditions
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading guidelines...</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-4 mb-8 text-primary-600">
                            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                                <FiShield size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Legal Agreement</h2>
                                <p className="text-sm text-gray-500">Please read carefully before using the platform</p>
                            </div>
                        </div>

                        <div className="prose prose-blue max-w-none">
                            <div className="whitespace-pre-line text-gray-600 leading-relaxed font-medium">
                                {content}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-loose">
                                Dealing India B2B Platform<br />
                                © 2026 All Rights Reserved
                            </p>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default TermsAndConditions;
