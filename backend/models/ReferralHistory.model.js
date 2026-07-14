import mongoose from 'mongoose';

const referralHistorySchema = new mongoose.Schema(
    {
        referrerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'referrerModel',
        },
        referrerModel: {
            type: String,
            required: true,
            enum: ['User', 'Vendor'],
        },
        referredUserId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'referredModel',
        },
        referredModel: {
            type: String,
            required: true,
            enum: ['User', 'Vendor'],
            default: 'User',
        },
        referralCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'rejected'],
            default: 'completed',
        },
    },
    {
        timestamps: true,
    }
);

referralHistorySchema.index({ referrerId: 1, createdAt: -1 });
referralHistorySchema.index({ referredUserId: 1 }, { unique: true });

const ReferralHistory = mongoose.model('ReferralHistory', referralHistorySchema);

export default ReferralHistory;
