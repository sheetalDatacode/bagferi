import mongoose from 'mongoose';

const vendorWalletSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            unique: true,
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
        pendingBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalWithdrawn: {
            type: Number,
            default: 0,
        },
        lastWithdrawalDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const VendorWallet = mongoose.model('VendorWallet', vendorWalletSchema);

export default VendorWallet;
