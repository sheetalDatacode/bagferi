import mongoose from 'mongoose';

const cancellationRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    refundMethod: {
      type: String,
      enum: ['wallet', 'bank_transfer'],
      required: true,
    },
    // Bank/UPI details (only for bank_transfer)
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
      upiId: { type: String, trim: true },
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'pending',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

cancellationRequestSchema.index({ userId: 1, status: 1 });
cancellationRequestSchema.index({ orderId: 1 });
cancellationRequestSchema.index({ status: 1, createdAt: -1 });

const CancellationRequest = mongoose.model('CancellationRequest', cancellationRequestSchema);
export default CancellationRequest;
