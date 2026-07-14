import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionCode: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['payment', 'refund'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    method: {
      type: String,
      required: true,
    },
    paymentGateway: {
      type: String,
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      sparse: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ customerId: 1, transactionDate: -1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;

