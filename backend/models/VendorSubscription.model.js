import mongoose from 'mongoose';

const vendorSubscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false, // Made optional for pre-payment subscriptions
    },
    // For B2B registration: subscription created before vendor registration
    pendingVendorEmail: {
      type: String,
      required: false,
      index: true,
    },
    pendingVendorPhone: {
      type: String,
      required: false,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BSubscriptionPlan',
      required: true, // Now required for all new B2B subscriptions
    },
    // tierId removed (Legacy B2C)
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending', 'failed'],
      default: 'pending',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'quarterly', 'half-yearly'],
      required: true,
      default: 'monthly',
    },
    usage: {
      lastResetDate: { type: Date, default: Date.now },
      enquiriesUsed: { type: Number, default: 0 },
      // Future: Add B2B specific usage tracking here (e.g. productsCount if needed)
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    razorpaySubscriptionId: {
      type: String,
    },
    // Payment Breakdown for GST compliance
    basePrice: { type: Number, default: 0 },     // Net base after credit/discount
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },   // totalAmount = basePrice + gstAmount
    discount: { type: Number, default: 0 },      // Regular plan discount (not upgrade credit)
    // Upgrade-specific audit fields
    oldPlanPrice: { type: Number, default: 0 },  // Full price of old plan
    newPlanPrice: { type: Number, default: 0 },  // Full price of new plan
    usedDays: { type: Number, default: 0 },
    remainingDays: { type: Number, default: 0 },
    unusedCredit: { type: Number, default: 0 },  // Credit from old plan (perDayCost * remainingDays)
    paidAmount: { type: Number, default: 0 },    // Actual amount charged via Razorpay
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
    lastPaymentDate: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    cancellationDate: {
      type: Date,
    },
    auditLogs: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        details: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
vendorSubscriptionSchema.index({ vendorId: 1, status: 1 });
vendorSubscriptionSchema.index({ endDate: 1 });
vendorSubscriptionSchema.index({ planId: 1 });
vendorSubscriptionSchema.index({ paymentMethod: 1 });

// Normalize billingCycle to lowercase (e.g. 'Yearly' -> 'yearly') before validation
vendorSubscriptionSchema.pre('validate', function (next) {
  if (this.billingCycle && typeof this.billingCycle === 'string') {
    const normalized = this.billingCycle.toLowerCase();
    if (['monthly', 'yearly', 'quarterly', 'half-yearly'].includes(normalized)) {
      this.billingCycle = normalized;
    }
  }
  next();
});

// Validation
vendorSubscriptionSchema.pre('validate', function (next) {
  if (!this.planId) {
    const error = new Error('planId must be provided');
    error.name = 'ValidationError';
    return next(error);
  }

  if (!this.vendorId && !this.pendingVendorEmail) {
    const error = new Error('Either vendorId or pendingVendorEmail must be provided');
    error.name = 'ValidationError';
    return next(error);
  }

  next();
});

const VendorSubscription = mongoose.model('VendorSubscription', vendorSubscriptionSchema);

export default VendorSubscription;
