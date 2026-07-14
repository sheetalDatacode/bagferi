import PlatformLedger from '../models/PlatformLedger.model.js';
import mongoose from 'mongoose';

/**
 * PlatformLedgerService - Handles all admin-side financial bookkeeping
 * for banner bookings using double-entry accounting principles.
 * 
 * Rules:
 * - Every vendor payment = Platform CREDIT (PAYMENT_RECEIVED)
 * - Every refund = Platform DEBIT (BOOKING_REFUND)
 * - Revenue recognized only when status = active/completed (BANNER_REVENUE_REALIZED)
 * - Wallet payments are tracked separately (WALLET_PAYMENT_USED)
 */
class PlatformLedgerService {
    /**
     * Record a payment received from vendor (Razorpay or Wallet)
     * This is a CREDIT to the platform (money coming in)
     */
    async recordPaymentReceived({ bookingId, vendorId, amount, paymentMethod, referenceId, description, session = null }) {
        const entry = {
            entryType: 'credit',
            transactionType: paymentMethod === 'wallet' ? 'WALLET_PAYMENT_USED' : 'PAYMENT_RECEIVED',
            amount,
            description: description || `Banner booking payment received via ${paymentMethod}`,
            bookingId,
            vendorId,
            referenceId,
            paymentMethod,
            metadata: { source: 'banner_booking' },
        };

        if (session) {
            return await PlatformLedger.create([entry], { session });
        }
        return await PlatformLedger.create(entry);
    }

    /**
     * Record a refund issued to vendor
     * This is a DEBIT to the platform (money going out)
     */
    async recordRefund({ bookingId, vendorId, amount, referenceId, description, vendorTransactionId = null, session = null }) {
        const entry = {
            entryType: 'debit',
            transactionType: 'BOOKING_REFUND',
            amount,
            description: description || `Refund for banner booking`,
            bookingId,
            vendorId,
            referenceId,
            vendorTransactionId,
            metadata: { source: 'banner_booking_refund' },
        };

        if (session) {
            return await PlatformLedger.create([entry], { session });
        }
        return await PlatformLedger.create(entry);
    }

    /**
     * Record revenue realization when booking becomes ACTIVE
     * This marks the payment as confirmed revenue (not just a deposit)
     */
    async recordRevenueRealized({ bookingId, vendorId, amount, referenceId, session = null }) {
        // Check if already realized to prevent duplicates
        const existing = await PlatformLedger.findOne({
            bookingId,
            transactionType: 'BANNER_REVENUE_REALIZED',
        });

        if (existing) {
            console.log(`⚠️ [PlatformLedger] Revenue already realized for booking: ${bookingId}`);
            return existing;
        }

        const entry = {
            entryType: 'credit',
            transactionType: 'BANNER_REVENUE_REALIZED',
            amount,
            description: `Banner revenue realized - booking active: ${referenceId}`,
            bookingId,
            vendorId,
            referenceId,
            metadata: { source: 'revenue_recognition' },
        };

        if (session) {
            return await PlatformLedger.create([entry], { session });
        }
        return await PlatformLedger.create(entry);
    }

    /**
     * Get platform financial summary for banner bookings
     */
    async getBannerFinancialSummary(bannerType = 'b2b') {
        const [
            totalPaymentsReceived,
            totalRefundsIssued,
            totalRevenueRealized,
        ] = await Promise.all([
            // Total payments received (credits)
            PlatformLedger.aggregate([
                { $match: { entryType: 'credit', transactionType: { $in: ['PAYMENT_RECEIVED', 'WALLET_PAYMENT_USED'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            // Total refunds issued (debits)
            PlatformLedger.aggregate([
                { $match: { entryType: 'debit', transactionType: 'BOOKING_REFUND' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            // Total revenue realized
            PlatformLedger.aggregate([
                { $match: { transactionType: 'BANNER_REVENUE_REALIZED' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
        ]);

        const payments = totalPaymentsReceived[0]?.total || 0;
        const refunds = totalRefundsIssued[0]?.total || 0;
        const revenue = totalRevenueRealized[0]?.total || 0;

        return {
            totalPaymentsReceived: payments,
            totalRefundsIssued: refunds,
            netCollections: payments - refunds,
            realizedRevenue: revenue,
            unrealizedDeposits: (payments - refunds) - revenue,
        };
    }

    /**
     * Get all ledger entries for a specific booking
     */
    async getBookingLedgerEntries(bookingId) {
        return await PlatformLedger.find({ bookingId }).sort({ createdAt: 1 });
    }

    /**
     * Get recent ledger entries
     */
    async getRecentEntries(limit = 50) {
        return await PlatformLedger.find()
            .populate('vendorId', 'name storeName email')
            .populate('bookingId', 'referenceId bannerType amount')
            .sort({ createdAt: -1 })
            .limit(limit);
    }
}

export default new PlatformLedgerService();
