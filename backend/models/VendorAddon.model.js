import mongoose from 'mongoose';

const vendorAddonSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required'],
      index: true,
    },
    addonPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BAddonPlan',
      required: [true, 'Addon plan reference is required'],
    },
    featureType: {
      type: String,
      required: [true, 'Feature type is required'],
      enum: ['reels', 'products', 'lot_slot', 'property', 'enquiry', 'jobs'],
      index: true,
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Total quantity must be at least 1'],
    },
    purchasedPacks: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      required: [true, 'Used count is required'],
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date, // Optional expiry date
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'expired'],
      default: 'active',
      index: true,
    },
    paymentId: {
      type: String,
      required: [true, 'Payment ID is required'],
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'razorpay',
      enum: ['razorpay', 'wallet'],
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    razorpayPaymentId: { // Added for completeness if needed
      type: String,
      index: true,
    },
    // Payment breakdown for GST
    basePrice: {
      type: Number,
      required: [false],
    },
    gstAmount: {
      type: Number,
      required: [false],
    },
    totalAmount: {
      type: Number,
      required: [false],
    },
    discount: {
      type: Number,
      required: [false],
      default: 0,
    },
    // Zoho Books integration fields
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

// Helpful instance method to check if a specific add-on is usable
vendorAddonSchema.methods.isUsable = function() {
  if (this.status !== 'active') return false;
  if (this.usedCount >= this.totalQuantity) return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
};

const VendorAddon =
  mongoose.models.VendorAddon ||
  mongoose.model('VendorAddon', vendorAddonSchema);

export default VendorAddon;
