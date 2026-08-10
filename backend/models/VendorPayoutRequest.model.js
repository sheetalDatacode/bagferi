import mongoose from 'mongoose';

const vendorPayoutRequestSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            index: true,
        },
        month: {
            type: String,
            required: true, // e.g. "August 2026"
        },
        period: {
            type: String,
            required: true, // e.g. "1-7", "8-15", "16-23", "24-31"
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
            index: true,
        },
        referenceNumber: {
            type: String,
            default: '',
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a vendor can only have one payout request per month and period
vendorPayoutRequestSchema.index({ vendorId: 1, month: 1, period: 1 }, { unique: true });

const VendorPayoutRequest = mongoose.model('VendorPayoutRequest', vendorPayoutRequestSchema);

export default VendorPayoutRequest;
