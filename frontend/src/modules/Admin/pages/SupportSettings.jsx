import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiPlus, FiTrash2, FiChevronLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSupportConfig, updateSupportConfig } from '../../../shared/services/supportService';

const SupportSettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        heroTitle: '',
        heroSubtitle: '',
        phone: '',
        phoneTitle: '',
        email: '',
        emailTitle: '',
        whatsapp: '',
        whatsappTitle: '',
        whatsappDesc: '',
        whatsappButtonText: '',
        faqTitle: '',
        callHours: '',
        emailResponse: '',
        instagram: '',
        facebook: '',
        youtube: '',
        userHowToVideo: '',
        userHowToText: '',
        vendorHowToVideo: '',
        vendorHowToText: '',
        userTermsAndConditions: '',
        vendorTermsAndConditions: '',
        faqs: []
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) {
                    setConfig(prev => ({
                        ...prev,
                        ...res.data
                    }));
                }
            } catch (error) {
                toast.error('Failed to load support settings');
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleFAQChange = (index, field, value) => {
        const newFAQs = [...config.faqs];
        newFAQs[index][field] = value;
        setConfig(prev => ({ ...prev, faqs: newFAQs }));
    };

    const addFAQ = () => {
        setConfig(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: '', answer: '' }]
        }));
    };

    const removeFAQ = (index) => {
        const newFAQs = config.faqs.filter((_, i) => i !== index);
        setConfig(prev => ({ ...prev, faqs: newFAQs }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await updateSupportConfig(config);
            if (res.success) {
                toast.success('Support settings updated successfully');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-10"
        >
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <FiChevronLeft size={24} />
                </button>
                <div></div>

            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Visual Header Settings */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Page Header (Hero)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Page Main Title</label>
                            <input
                                type="text"
                                name="heroTitle"
                                value={config.heroTitle}
                                onChange={handleChange}
                                placeholder="Support & Help"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Page Subtitle</label>
                            <input
                                type="text"
                                name="heroSubtitle"
                                value={config.heroSubtitle}
                                onChange={handleChange}
                                placeholder="We are here to help you..."
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Call Section Title</label>
                            <input
                                type="text"
                                name="phoneTitle"
                                value={config.phoneTitle}
                                onChange={handleChange}
                                placeholder="Call B2B Desk"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Call Desk Phone</label>
                            <input
                                type="text"
                                name="phone"
                                value={config.phone}
                                onChange={handleChange}
                                placeholder="+918000000000"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Call Working Hours</label>
                            <input
                                type="text"
                                name="callHours"
                                value={config.callHours}
                                onChange={handleChange}
                                placeholder="9 AM - 7 PM (Mon-Sat)"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <hr className="md:col-span-2 border-gray-100" />
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Email Section Title</label>
                            <input
                                type="text"
                                name="emailTitle"
                                value={config.emailTitle}
                                onChange={handleChange}
                                placeholder="Email Support"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={config.email}
                                onChange={handleChange}
                                placeholder="support@dealingindia.com"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Email Response Time</label>
                            <input
                                type="text"
                                name="emailResponse"
                                value={config.emailResponse}
                                onChange={handleChange}
                                placeholder="response within 4 hours"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <hr className="md:col-span-2 border-gray-100" />
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">WhatsApp Banner Title</label>
                            <input
                                type="text"
                                name="whatsappTitle"
                                value={config.whatsappTitle}
                                onChange={handleChange}
                                placeholder="Need Instant Help?"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">WhatsApp Number (e.g. 918000000000)</label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={config.whatsapp}
                                onChange={handleChange}
                                placeholder="918000000000"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">WhatsApp Description</label>
                            <input
                                type="text"
                                name="whatsappDesc"
                                value={config.whatsappDesc}
                                onChange={handleChange}
                                placeholder="Our B2B specialists are available on WhatsApp..."
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">WhatsApp Button Text</label>
                            <input
                                type="text"
                                name="whatsappButtonText"
                                value={config.whatsappButtonText}
                                onChange={handleChange}
                                placeholder="WhatsApp Us"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <hr className="md:col-span-2 border-gray-100" />
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">FAQ Section Title</label>
                            <input
                                type="text"
                                name="faqTitle"
                                value={config.faqTitle}
                                onChange={handleChange}
                                placeholder="Frequently Asked Questions"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Social Media Links */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 underline decoration-primary-500/30 decoration-4 underline-offset-8">Social Media Links</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Instagram URL</label>
                            <input
                                type="url"
                                name="instagram"
                                value={config.instagram || ''}
                                onChange={handleChange}
                                placeholder="https://instagram.com/dealing_india"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Facebook URL</label>
                            <input
                                type="url"
                                name="facebook"
                                value={config.facebook || ''}
                                onChange={handleChange}
                                placeholder="https://facebook.com/dealing_india"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">YouTube URL</label>
                            <input
                                type="url"
                                name="youtube"
                                value={config.youtube || ''}
                                onChange={handleChange}
                                placeholder="https://youtube.com/@dealing_india"
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Platform Guide Videos */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 underline decoration-emerald-500/30 decoration-4 underline-offset-8">How to Use Platform (Videos)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">User Module Guide Video URL</label>
                            <input
                                type="url"
                                name="userHowToVideo"
                                value={config.userHowToVideo || ''}
                                onChange={handleChange}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                            <p className="text-[10px] text-gray-400 ml-1 italic">This video will be shown on the User Profile page</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">User Guide Script/Text</label>
                            <textarea
                                name="userHowToText"
                                value={config.userHowToText || ''}
                                onChange={handleChange}
                                placeholder="Explain how to use the marketplace..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Vendor Module Guide Video URL</label>
                            <input
                                type="url"
                                name="vendorHowToVideo"
                                value={config.vendorHowToVideo || ''}
                                onChange={handleChange}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                            />
                            <p className="text-[10px] text-gray-400 ml-1 italic">This video will be shown in the Vendor Sidebar</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Vendor Guide Script/Text</label>
                            <textarea
                                name="vendorHowToText"
                                value={config.vendorHowToText || ''}
                                onChange={handleChange}
                                placeholder="Explain how to master the vendor dashboard..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Terms & Conditions Settings */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 underline decoration-amber-500/30 decoration-4 underline-offset-8">Terms & Conditions (Legal)</h2>
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">User Module Terms & Conditions</label>
                            <textarea
                                name="userTermsAndConditions"
                                value={config.userTermsAndConditions || ''}
                                onChange={handleChange}
                                placeholder="Enter user terms and conditions here..."
                                rows={8}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none bg-gray-50/30"
                            />
                            <p className="text-[10px] text-gray-400 ml-1 italic">Shown on User Login & Profile pages</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Vendor Module Terms & Conditions</label>
                            <textarea
                                name="vendorTermsAndConditions"
                                value={config.vendorTermsAndConditions || ''}
                                onChange={handleChange}
                                placeholder="Enter vendor terms and conditions here..."
                                rows={8}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none bg-gray-50/30"
                            />
                            <p className="text-[10px] text-gray-400 ml-1 italic">Shown on Vendor Login & Profile pages</p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Frequently Asked Questions</h2>
                        <button
                            type="button"
                            onClick={addFAQ}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-100 transition-all active:scale-95"
                        >
                            <FiPlus /> Add FAQ
                        </button>
                    </div>

                    <div className="space-y-6">
                        {config.faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4 relative group"
                            >
                                <button
                                    type="button"
                                    onClick={() => removeFAQ(index)}
                                    className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                                <div className="space-y-1.5 pr-8">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {index + 1}</label>
                                    <input
                                        type="text"
                                        value={faq.question}
                                        onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                                        placeholder="Enter the question"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5 pr-8">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Answer</label>
                                    <textarea
                                        value={faq.answer}
                                        onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                                        placeholder="Enter the answer"
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none bg-white resize-none"
                                    />
                                </div>
                            </motion.div>
                        ))}
                        {config.faqs.length === 0 && (
                            <div className="text-center py-10 text-gray-400 italic">
                                No FAQs added yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="sticky bottom-8 flex justify-end pr-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={saving}
                        className={`
                            flex items-center gap-3 px-10 py-4 rounded-2xl font-extrabold text-white shadow-xl
                            ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}
                            transition-all duration-300
                        `}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <FiSave size={20} />
                        )}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default SupportSettings;
