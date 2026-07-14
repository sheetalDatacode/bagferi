import mongoose from 'mongoose';

const subscriptionTierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        priceMonthly: {
            type: Number,
            required: true,
            min: 0,
        },
        reelLimit: {
            type: Number,
            required: true,
            default: 0, // 0 for free, -1 for unlimited
        },
        extraReelPrice: {
            type: Number,
            default: 10,
        },
        features: [String],
        isActive: {
            type: Boolean,
            default: true,
        },
        razorpayPlanId: {
            type: String,
            default: null,
        },
        description: String,
    },
    {
        timestamps: true,
    }
);

const SubscriptionTier = mongoose.model('SubscriptionTier', subscriptionTierSchema);

export default SubscriptionTier;
