import { FiArrowLeft, FiShield } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PrivacyPolicy = ({ type = 'user' }) => {
    const navigate = useNavigate();

    const isVendor = type === 'vendor';

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 capitalize">
                            <FiShield className="text-primary-600" />
                            {type} Privacy Policy
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 prose prose-slate max-w-none"
                >
                    <div className="space-y-6 text-gray-600">
                        <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
                        
                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Introduction</h2>
                        <p>
                            Welcome to Dealing India. We respect your privacy and are committed to protecting your personal data. 
                            This privacy policy will inform you as to how we look after your personal data when you visit our website 
                            or use our {isVendor ? 'vendor application' : 'application'} and tell you about your privacy rights and how the law protects you.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. The Data We Collect About You</h2>
                        <p>
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier, and business information.</li>
                            <li><strong>Contact Data</strong> includes {isVendor ? 'business address, GST number' : 'billing address, delivery address'}, email address and telephone numbers.</li>
                            <li><strong>Financial Data</strong> includes bank account and payment card details.</li>
                            <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. How We Use Your Personal Data</h2>
                        <p>
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li>Where we need to comply with a legal or regulatory obligation.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">4. Data Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">5. Contact Us</h2>
                        <p>
                            If you have any questions about this privacy policy or our privacy practices, please contact our support team.
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
