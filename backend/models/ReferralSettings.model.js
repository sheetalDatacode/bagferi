import mongoose from 'mongoose';

const referralSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: 'global',
            unique: true,
            immutable: true,
        },
        vendorReferrerRewardPoints: {
            type: Number,
            default: 50,
            min: 0,
        },
        userReferrerRewardPoints: {
            type: Number,
            default: 50,
            min: 0,
        },
        newUserRewardPoints: {
            type: Number,
            default: 25,
            min: 0,
        },
        referralMilestoneMin: {
            type: Number,
            default: 10,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

const ReferralSettings = mongoose.model('ReferralSettings', referralSettingsSchema);

export default ReferralSettings;
