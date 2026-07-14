import mongoose from 'mongoose';

const smsOtpSchema = new mongoose.Schema(
    {
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index
        },
        attempts: {
            type: Number,
            default: 0,
        },
        used: {
            type: Boolean,
            default: false,
        },
        purpose: {
            type: String,
            enum: ['registration', 'login', 'password_reset', 'verification'],
            default: 'verification',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookup
smsOtpSchema.index({ phoneNumber: 1, createdAt: -1 });

const SMSOTP = mongoose.model('SMSOTP', smsOtpSchema);

export default SMSOTP;
