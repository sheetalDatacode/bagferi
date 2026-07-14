import React from 'react';
import { FiPhoneCall, FiMail, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getSupportConfig } from '../../../shared/services/supportService';
import { useAuthStore } from '../../../shared/store/authStore';

const SupportCards = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [config, setConfig] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

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

    const {
        phone = '+918000000000',
        phoneTitle = 'Call B2B Desk',
        email = 'support@dealingindia.com',
        emailTitle = 'Email Support',
        whatsapp = '918000000000',
        whatsappTitle = 'Instant WhatsApp',
        whatsappDesc = 'Chat with us for real-time help',
        callHours = '9 AM - 7 PM (Mon-Sat)',
        emailResponse = 'response within 4 hours'
    } = config || {};

    const handleSupportRedirect = () => {
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/support' } } });
            return;
        }
        navigate('/b2b/support');
    };

    if (loading) {
        return (
            <div className="w-full py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <section className="w-full py-8 border-t border-gray-100 flex-none pb-24 md:pb-16 bg-gray-50/30">
            <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-[11px] md:text-sm font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        HELP & SUPPORT
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        type="button"
                        onClick={handleSupportRedirect}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-200 transition-all hover:shadow-lg"
                    >
                        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors shadow-inner">
                            <FiPhoneCall size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{phoneTitle}</p>
                            <p className="text-sm font-black text-primary-600 mb-1">{phone}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{callHours}</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={handleSupportRedirect}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-200 transition-all hover:shadow-lg"
                    >
                        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors shadow-inner">
                            <FiMail size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{emailTitle}</p>
                            <p className="text-sm font-black text-primary-600 mb-1">{email}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{emailResponse}</p>
                        </div>
                    </button>

                    <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSupportRedirect();
                        }}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex flex-col items-center justify-center gap-4 text-center group hover:border-green-200 transition-all hover:shadow-lg"
                    >
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors shadow-inner">
                            <FiMessageSquare size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{whatsappTitle}</p>
                            <p className="text-sm font-black text-green-600 mb-1">+{whatsapp}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{whatsappDesc}</p>
                        </div>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default SupportCards;
