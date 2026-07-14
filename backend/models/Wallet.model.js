import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    pointsBalance: { type: Number, default: 0, min: 0 },
    pointsHistory: [{
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        points: {
            type: Number,
            required: true,
            min: 0,
        },
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
        },
        sourceType: {
            type: String,
            trim: true,
        },
        sourceId: {
            type: String,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }]
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
