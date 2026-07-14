import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlayCircle, FiChevronLeft, FiBook } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getSupportConfig } from '../../../shared/services/supportService';

const VendorHowToUse = () => {
    const navigate = useNavigate();
    const [supportConfig, setSupportConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSupport = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) setSupportConfig(res.data);
            } catch (err) {} finally {
                setLoading(false);
            }
        };
        fetchSupport();
    }, []);

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0&showinfo=0` : url;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold">Back to Dashboard</span>
                    </button>
                    <button 
                        onClick={() => navigate('/b2b-vendor/support')}
                        className="px-4 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-xs font-bold uppercase tracking-widest hover:bg-primary-500/20 hover:text-primary-300 transition-colors cursor-pointer"
                        title="Go to Support & Feedback"
                    >
                        Vendor Support
                    </button>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-futo">Vendor Dashboard Guide</h1>
                    <p className="text-slate-400">Learn how to manage your business efficiently on Dealing India.</p>
                </div>

                {/* Main Content Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    {/* Video Player Section */}
                    <div className="p-8 border-b border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-500">
                            <FiPlayCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-futo">Video Tutorial</h2>
                            <p className="text-sm text-slate-500">Watch the visual guide to get started.</p>
                        </div>
                    </div>

                    <div className="aspect-video w-full bg-black relative">
                        {supportConfig?.vendorHowToVideo ? (
                            <iframe
                                src={getYouTubeEmbedUrl(supportConfig.vendorHowToVideo)}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 gap-4">
                                <FiPlayCircle size={64} className="opacity-10" />
                                <p className="text-sm font-medium">Video guide not available yet</p>
                            </div>
                        )}
                    </div>

                    {/* Text Instructions Section */}
                    {supportConfig?.vendorHowToText && (
                        <div className="p-8 md:p-12 bg-slate-800/30">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl">
                                    <FiBook size={18} />
                                </div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step-by-Step Instructions</h3>
                            </div>
                            <div className="text-slate-300 leading-loose whitespace-pre-line font-medium text-lg">
                                {supportConfig.vendorHowToText}
                            </div>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default VendorHowToUse;
