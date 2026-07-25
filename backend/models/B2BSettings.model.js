import mongoose from 'mongoose';

const b2bSettingsSchema = new mongoose.Schema(
    {
        defaultEnquiryPrice: {
            type: Number,
            default: 1,
            min: 0
        },
        advancePaymentAmount: {
            type: Number,
            default: 200,
            min: 0
        },
        advancePaymentCommissionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        enableVideoFileUpload: {
            type: Boolean,
            default: true
        },
        homeFeatures: [
            {
                title: { type: String, required: true },
                subtitle: { type: String },
                iconName: { type: String, default: 'FiCheckCircle' },
                isActive: { type: Boolean, default: true }
            }
        ],
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    },
    {
        timestamps: true
    }
);

// Middleware to ensure default home features exist on creation
b2bSettingsSchema.pre('save', function(next) {
    if (this.isNew && (!this.homeFeatures || this.homeFeatures.length === 0)) {
        this.homeFeatures = [
            { title: 'Advance payment 200 fix', subtitle: '', iconName: 'FiCreditCard', isActive: true },
            { title: 'Only exchange', subtitle: 'Exchange Shop pr hoga Platform pr nhi', iconName: 'FiRefreshCw', isActive: true },
            { title: 'Free delivery', subtitle: '', iconName: 'FiPackage', isActive: true }
        ];
    }
    next();
});

const B2BSettings = mongoose.model('B2BSettings', b2bSettingsSchema);

export default B2BSettings;
