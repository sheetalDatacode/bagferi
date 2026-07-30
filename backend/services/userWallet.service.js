import Wallet from '../models/Wallet.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import mongoose from 'mongoose';

class UserWalletService {
  /**
   * Get or create a wallet for a user
   */
  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, pointsBalance: 0 });
    }
    return wallet;
  }

  /**
   * Credit user wallet (e.g., from order cancellation refund)
   */
  async creditWallet(userId, amount, description, referenceId, referenceType = 'refund') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const wallet = await this.getOrCreateWallet(userId);
      wallet.balance = (wallet.balance || 0) + amount;
      await wallet.save({ session });

      await WalletTransaction.create([{
        walletId: wallet._id,
        userId,
        type: 'credit',
        amount,
        description,
        referenceId: String(referenceId),
        referenceType,
        status: 'completed',
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
   * Debit user wallet (e.g., for future wallet-based payments)
   */
  async debitWallet(userId, amount, description, referenceId, referenceType = 'payment') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const wallet = await this.getOrCreateWallet(userId);
      if ((wallet.balance || 0) < amount) {
        throw new Error('Insufficient wallet balance');
      }
      wallet.balance -= amount;
      await wallet.save({ session });

      await WalletTransaction.create([{
        walletId: wallet._id,
        userId,
        type: 'debit',
        amount,
        description,
        referenceId: String(referenceId),
        referenceType,
        status: 'completed',
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
   * Get wallet balance for a user
   */
  async getBalance(userId) {
    const wallet = await Wallet.findOne({ userId });
    return wallet ? (wallet.balance || 0) : 0;
  }

  /**
   * Get wallet with transaction history
   */
  async getWalletWithHistory(userId, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return { wallet, transactions };
  }
}

export default new UserWalletService();
