import mongoose from 'mongoose';

/**
 * PlatformLedger - Admin-side financial ledger for double-entry accounting.
 * 
 * Every vendor payment creates a CREDIT entry here (money coming in).
 * Every refund creates a DEBIT entry here (money going out).
 * Revenue is only recognized when booking becomes ACTIVE or COMPLETED.
 * 
 * This ensures:
 * - Accurate financial reporting
 * - Every vendor wallet transaction has a mirrored platform entry
 * - No inflated revenue from pending/cancelled bookings
 */
const platformLedgerSchema = new mongoose.Schema(
    {
        entryType: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        transactionType: {
            type: String,
            enum: [
                'PAYMENT_RECEIVED',        // Vendor paid for booking (Razorpay or Wallet)
                'BOOKING_REFUND',           // Refund issued to vendor on rejection/cancellation
                'BANNER_REVENUE_REALIZED',  // Revenue recognized when booking becomes active
                'WALLET_PAYMENT_USED',      // Vendor used wallet balance for payment
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BannerBooking',
            default: null,
        },
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null,
        },
        referenceId: {
            type: String,
            default: null,
        },
        // Links to the corresponding vendor wallet transaction
        vendorTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VendorWalletTransaction',
            default: null,
        },
        paymentMethod: {
            type: String,
            enum: ['razorpay', 'wallet', 'upi', 'card', null],
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
platformLedgerSchema.index({ bookingId: 1 });
platformLedgerSchema.index({ vendorId: 1, createdAt: -1 });
platformLedgerSchema.index({ transactionType: 1, createdAt: -1 });
platformLedgerSchema.index({ entryType: 1, createdAt: -1 });

const PlatformLedger = mongoose.model('PlatformLedger', platformLedgerSchema);

export default PlatformLedger;
