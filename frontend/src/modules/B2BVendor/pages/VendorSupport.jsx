import React from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiPhoneCall, FiMail, FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import B2BVendorHeader from '../components/Layout/B2BVendorHeader';
import { getSupportConfig } from '../../../shared/services/supportService';
import { submitFeedback } from '../../../shared/services/feedbackService';
import toast from 'react-hot-toast';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-slate-700 rounded-2xl bg-slate-800 overflow-hidden shadow-sm transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <span className="font-bold text-slate-200 text-sm">{question}</span>
                {isOpen ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    <p className="text-xs text-slate-400 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
};

const VendorSupport = () => {
    const [config, setConfig] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [feedback, setFeedback] = React.useState({ subject: '', message: '' });

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.subject || !feedback.message) {
            return toast.error('Please fill in all fields');
        }

        setSubmitting(true);
        try {
            const res = await submitFeedback({
                ...feedback,
                role: 'vendor'
            });
            if (res.success) {
                toast.success('Feedback submitted successfully');
                setFeedback({ subject: '', message: '' });
            }
        } catch (error) {
            console.error('Feedback error:', error);
            toast.error(error.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) {
                    setConfig(res.data);
                }
            } catch (error) {
                console.error('Error fetching support config:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const {
        heroTitle = 'Vendor Support',
        heroSubtitle = 'Need help with your vendor account?',
        phone = '+918000000000',
        phoneTitle = 'Call B2B Helpdesk',
        email = 'support@dealingindia.com',
        emailTitle = 'Email Support',
        whatsapp = '918000000000',
        whatsappTitle = 'Vendor WhatsApp',
        whatsappDesc = 'Instant help for vendors',
        faqTitle = 'Frequently Asked Questions',
        callHours = '9 AM - 7 PM (Mon-Sat)',
        emailResponse = 'response within 4 hours',
        faqs = []
    } = config || {};

    return (
        <div className="min-h-screen bg-slate-900 pb-20">
            <B2BVendorHeader title={heroTitle} />

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

                {/* Hero Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-white tracking-tight">{heroTitle}</h1>
                    <p className="text-slate-400 font-medium">{heroSubtitle}</p>
                </div>

                {/* Contact Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <a
                        href={`tel:${phone}`}
                        className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-500/50 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors shadow-inner">
                            <FiPhoneCall size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-lg leading-tight mb-1">{phoneTitle}</p>
                            <p className="text-sm font-black text-primary-500 mb-1">{phone}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{callHours}</p>
                        </div>
                    </a>

                    <a
                        href={`mailto:${email}`}
                        className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-500/50 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors shadow-inner">
                            <FiMail size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-lg leading-tight mb-1">{emailTitle}</p>
                            <p className="text-sm font-black text-primary-500 mb-1">{email}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{emailResponse}</p>
                        </div>
                    </a>

                    <a
                        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-green-500/50 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors shadow-inner">
                            <FiMessageSquare size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-lg leading-tight mb-1">{whatsappTitle}</p>
                            <p className="text-sm font-black text-green-500 mb-1">+{whatsapp}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{whatsappDesc}</p>
                        </div>
                    </a>
                </div>

                {/* Feedback Form */}
                <div className="pt-4 max-w-2xl mx-auto w-full">
                    <div className="bg-slate-800 rounded-[2.5rem] p-8 border border-slate-700 shadow-sm space-y-6">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">Any Kind of Feedback?</h3>
                            <p className="text-slate-400 text-sm font-medium">We value our vendor's suggestions and concerns</p>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Subject</label>
                                <input
                                    type="text"
                                    value={feedback.subject}
                                    onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })}
                                    placeholder="Brief topic of your feedback"
                                    className="w-full bg-slate-900/50 border-slate-700 border rounded-2xl p-4 text-sm font-bold text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Message</label>
                                <textarea
                                    value={feedback.message}
                                    onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                                    placeholder="Tell us more details..."
                                    rows={4}
                                    className="w-full bg-slate-900/50 border-slate-700 border rounded-2xl p-4 text-sm font-bold text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-primary-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary-900/20 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                            >
                                {submitting ? 'Submitting...' : 'Send Feedback to Admin'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* FAQs */}
                <div className="pt-4 max-w-2xl mx-auto w-full">
                    <div className="flex items-center gap-2 mb-8 justify-center">
                        <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                        <h3 className="font-black text-white text-2xl tracking-tight">{faqTitle}</h3>
                        <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default VendorSupport;
