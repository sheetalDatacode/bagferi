import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: String,
    referenceId: String,
    referenceType: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
