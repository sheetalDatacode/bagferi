import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlayCircle, FiChevronLeft, FiBookOpen } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { getSupportConfig } from '../../../shared/services/supportService';

const HowToUse = () => {
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="How to Use Platform" showBack={true} onBack={() => navigate(-1)} />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Hero Section */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-3 bg-primary-50 text-primary-600 rounded-2xl mb-2">
                            <FiBookOpen size={24} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">User Guide & Tutorials</h1>
                        <p className="text-gray-500 max-w-md mx-auto">Master the Dealing India B2B marketplace with these simple instructions.</p>
                    </div>

                    {/* Video Section */}
                    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                                    <FiPlayCircle size={20} />
                                </div>
                                <h2 className="font-bold text-gray-800">Video Walkthrough</h2>
                            </div>
                            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full">Official Guide</span>
                        </div>
                        
                        <div className="aspect-video w-full bg-slate-900 relative">
                            {supportConfig?.userHowToVideo ? (
                                <iframe
                                    src={getYouTubeEmbedUrl(supportConfig.userHowToVideo)}
                                    className="w-full h-full border-none"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-4">
                                    <FiPlayCircle size={64} className="opacity-10" />
                                    <p className="text-sm font-medium">Guide video coming soon...</p>
                                </div>
                            )}
                        </div>

                        {/* Text Instructions */}
                        {supportConfig?.userHowToText && (
                            <div className="p-8 bg-slate-50/50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-1 h-3 bg-primary-500 rounded-full"></span> Step-by-Step Instructions
                                </h3>
                                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line font-medium">
                                    {supportConfig.userHowToText}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Tips */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: 'Search Bulk', desc: 'Use filters to find wholesalers faster.' },
                            { title: 'Direct Contact', desc: 'Call or WhatsApp vendors instantly.' },
                            { title: 'Secure Deals', desc: 'Every vendor is verified by our team.' }
                        ].map((tip, i) => (
                            <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-800 mb-1">{tip.title}</h4>
                                <p className="text-xs text-gray-500">{tip.desc}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default HowToUse;
