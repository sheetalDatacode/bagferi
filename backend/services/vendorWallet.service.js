import VendorWallet from '../models/VendorWallet.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';
import mongoose from 'mongoose';

class VendorWalletService {
    /**
     * Get or create a wallet for a vendor
     */
    async getOrCreateWallet(vendorId) {
        let wallet = await VendorWallet.findOne({ vendorId });
        if (!wallet) {
            wallet = await VendorWallet.create({
                vendorId,
                balance: 0,
                pendingBalance: 0
            });
        }
        return wallet;
    }

    /**
     * Credit vendor wallet (e.g., from order settlement or refund)
     */
    async creditWallet(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);
            const balanceBefore = wallet.balance;
            wallet.balance += amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description,
                referenceId,
                referenceType,
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Credit pending vendor wallet (during return window)
     */
    async creditPendingWallet(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);
            const pendingBalanceBefore = wallet.pendingBalance;
            wallet.pendingBalance += amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore: pendingBalanceBefore,
                balanceAfter: wallet.pendingBalance,
                description: `(Pending) ${description}`,
                referenceId,
                referenceType,
                metadata: { isPending: true }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Release pending funds to available balance
     */
    async releasePendingFunds(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            if (wallet.pendingBalance < amount) {
                console.warn(`Insufficient pending balance for release. Vendor: ${vendorId}, Required: ${amount}, Available: ${wallet.pendingBalance}`);
            }

            const pendingBefore = wallet.pendingBalance;
            const balanceBefore = wallet.balance;

            wallet.pendingBalance -= amount;
            wallet.balance += amount;

            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Funds Released: ${description}`,
                referenceId,
                referenceType,
                metadata: { wasReleasedFromPending: true }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Debit vendor wallet (prioritizing pending balance, then main balance)
     */
    async debitPendingOrBalance(vendorId, amount, description, referenceId, referenceType = 'refund') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            let debitedFrom = 'balance';
            let balanceBefore = wallet.balance;
            let balanceAfter = wallet.balance;

            // Try debiting from pending balance first
            if (wallet.pendingBalance >= amount) {
                balanceBefore = wallet.pendingBalance;
                wallet.pendingBalance -= amount;
                balanceAfter = wallet.pendingBalance;
                debitedFrom = 'pendingBalance';
            } else if (wallet.balance >= amount) {
                // Fallback to main balance
                wallet.balance -= amount;
                balanceAfter = wallet.balance;
            } else {
                // Insufficient funds in both (allow negative balance to ensure customer gets refund)
                wallet.balance -= amount;
                balanceAfter = wallet.balance;
            }

            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'debit',
                amount,
                balanceBefore,
                balanceAfter,
                description: `${description} (from ${debitedFrom === 'pendingBalance' ? 'Pending' : 'Available'})`,
                referenceId,
                referenceType,
                metadata: { source: debitedFrom }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Pay via wallet with balance check
     */
    async payViaWallet(vendorId, amount, description, referenceId, referenceType, metadata = {}) {
        const wallet = await this.getOrCreateWallet(vendorId);
        if (wallet.balance < amount) {
            throw new Error(`Insufficient wallet balance. Total required: ₹${amount}, Available: ₹${wallet.balance}`);
        }
        return await this.debitWallet(vendorId, amount, description, referenceId, referenceType, metadata);
    }

    /**
     * Debit vendor wallet (e.g., for banner bookings)
     */
    async debitWallet(vendorId, amount, description, referenceId, referenceType = 'refund', metadata = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            const balanceBefore = wallet.balance;
            wallet.balance -= amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'debit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description,
                referenceId,
                referenceType,
                metadata
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get transaction history for a vendor
     */
    async getVendorTransactions(vendorId) {
        return await VendorWalletTransaction.find({ vendorId }).sort({ createdAt: -1 });
    }

    /**
     * Get all vendor wallets (Admin)
     */
    async getAllVendorWallets() {
        const wallets = await VendorWallet.find()
            .populate({
                path: 'vendorId',
                match: { vendorType: 'b2b' },
                select: 'name storeName email phone'
            })
            .sort({ balance: -1 })
            .lean();

        return wallets.filter(wallet => wallet.vendorId);
    }

    /**
     * Get specific vendor wallet (Admin)
     */
    async getVendorWallet(vendorId) {
        return await this.getOrCreateWallet(vendorId);
    }
}

export default new VendorWalletService();
