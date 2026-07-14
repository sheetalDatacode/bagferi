import mongoose from 'mongoose';

const vendorWalletTransactionSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit', 'withdrawal', 'refund', 'adjustment'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        balanceBefore: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        referenceId: {
            type: String,
            default: null,
        },
        referenceType: {
            type: String,
            enum: ['order', 'withdrawal', 'adjustment', 'manual', 'refund', 'banner_booking', 'recharge', 'addon_plan', 'referral_reward', 'enquiry_unlock', 'subscription_plan'],
            default: 'manual',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'performedByModel',
            default: null,
        },
        performedByModel: {
            type: String,
            enum: ['Admin', 'Vendor', null],
            default: null,
        },
        zohoInvoiceId: {
            type: String,
            default: null,
        },
        zohoInvoicePdfUrl: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

vendorWalletTransactionSchema.index({ vendorId: 1, createdAt: -1 });
vendorWalletTransactionSchema.index({ referenceId: 1, referenceType: 1 });

const VendorWalletTransaction = mongoose.model('VendorWalletTransaction', vendorWalletTransactionSchema);

export default VendorWalletTransaction;
