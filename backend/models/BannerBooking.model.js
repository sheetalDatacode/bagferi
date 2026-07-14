import mongoose from 'mongoose';

const bannerBookingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerSlot',
      required: true,
    },
    bannerType: {
      type: String,
      enum: ['b2b'],
      required: true,
      default: 'b2b',
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },
    bannerImage: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '/',
    },
    title: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'upi', 'wallet', 'card'],
      default: 'razorpay',
    },
    adminApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    baseAmount: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 1,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    // Zoho Books integration fields
    zohoContactId: {
      type: String,
    },
    zohoInvoiceId: {
      type: String,
    },
    zohoInvoiceStatus: {
      type: String,
    },
    zohoInvoicePdfUrl: {
      type: String,
    },
    zohoPaymentId: {
      type: String,
    },
    emailNotification: {
      successSent: { type: Boolean, default: false },
      cancelSent: { type: Boolean, default: false },
      lastSentAt: { type: Date },
    },
    accountingErrors: [
      {
        at: { type: String },
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Optimize query for active public banners
bannerBookingSchema.index({ bannerType: 1, status: 1, paymentStatus: 1, startDate: 1, endDate: 1 });

const BannerBooking = mongoose.model('BannerBooking', bannerBookingSchema);

export default BannerBooking;
