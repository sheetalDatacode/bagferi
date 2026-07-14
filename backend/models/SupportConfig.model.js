import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
});

const supportConfigSchema = new mongoose.Schema({
    heroTitle: { type: String, default: 'Support & Help' },
    heroSubtitle: { type: String, default: 'We are here to help you with your B2B queries' },
    phone: { type: String, default: '+918000000000' },
    phoneTitle: { type: String, default: 'Call B2B Desk' },
    email: { type: String, default: 'support@dealingindia.com' },
    emailTitle: { type: String, default: 'Email Support' },
    whatsapp: { type: String, default: '918000000000' },
    whatsappTitle: { type: String, default: 'Need Instant Help?' },
    whatsappDesc: { type: String, default: 'Our B2B specialists are available on WhatsApp for real-time assistance.' },
    whatsappButtonText: { type: String, default: 'WhatsApp Us' },
    faqTitle: { type: String, default: 'Frequently Asked Questions' },
    callHours: { type: String, default: '9 AM - 7 PM (Mon-Sat)' },
    emailResponse: { type: String, default: 'response within 4 hours' },
    instagram: { type: String, default: 'https://instagram.com/dealing_india' },
    facebook: { type: String, default: 'https://facebook.com/dealing_india' },
    youtube: { type: String, default: 'https://youtube.com/@dealing_india' },
    userHowToVideo: { type: String, default: '' },
    userHowToText: { type: String, default: '' },
    vendorHowToVideo: { type: String, default: '' },
    vendorHowToText: { type: String, default: '' },
    userTermsAndConditions: { type: String, default: '' },
    vendorTermsAndConditions: { type: String, default: '' },
    faqs: {
        type: [faqSchema],
        default: [
            {
                question: "How do I get GST invoices for my business?",
                answer: "All bulk purchases through Dealing India B2B are GST compliant. You can download your Tax Invoice from the 'Order Details' section once the vendor confirms the dispatch."
            },
            {
                question: "What is Minimum Order Quantity (MOQ) and why is it required?",
                answer: "MOQ is the minimum quantity a wholesaler is willing to sell to maintain wholesale pricing. Each vendor sets their own MOQ based on the product category and manufacturing costs."
            },
            {
                question: "How to negotiate bulk pricing with vendors?",
                answer: "Direct negotiation is available via WhatsApp or Phone. For large orders, we recommend discussing volume-based discounts directly with the verified wholesaler."
            },
            {
                question: "Can I request samples before placing a large wholesale order?",
                answer: "Most vendors allow sample ordering. You can request samples directly via the WhatsApp contact option on the product details page."
            },
            {
                question: "How does Dealing India verify wholesalers?",
                answer: "Every vendor on our B2B platform undergo a multi-step verification process, including GSTIN validation, business premises verification, and trade history checks to ensure safe transactions."
            }
        ]
    }
}, { timestamps: true });

const SupportConfig = mongoose.model('SupportConfig', supportConfigSchema);

export default SupportConfig;
