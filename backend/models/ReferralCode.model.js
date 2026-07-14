import mongoose from 'mongoose';

const referralCodeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'userModel',
        },
        userModel: {
            type: String,
            required: true,
            enum: ['User', 'Vendor'],
        },
        referralCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        referralCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

referralCodeSchema.index({ userId: 1, userModel: 1 }, { unique: true });
referralCodeSchema.index({ referralCode: 1 }, { unique: true });

const ReferralCode = mongoose.model('ReferralCode', referralCodeSchema);

export default ReferralCode;
