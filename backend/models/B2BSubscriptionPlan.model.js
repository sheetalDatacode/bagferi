import mongoose from 'mongoose';

const b2bSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [100, 'Plan name cannot exceed 100 characters'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      enum: [3, 6, 12],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    gst: {
      type: Number,
      default: 18,
      min: [0, 'GST cannot be negative'],
    },
    features: [
      {
        type: String,
        trim: true,
        maxlength: [200, 'Feature description cannot exceed 200 characters'],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    razorpayPlanId: {
      type: String,
      default: null,
    },
    // Structured Features
    reelsLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    productLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    lotSlotLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    propertyLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    imagesPerListing: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 5,
    },
    enquiryLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    jobLimit: {
      type: mongoose.Schema.Types.Mixed, // Number or 'unlimited'
      default: 0,
    },
    enquiryPrice: {
      type: Number,
      default: 0,
      min: [0, 'Enquiry price cannot be negative'],
    },
    shopSlideshow: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active plans query
b2bSubscriptionPlanSchema.index({ isActive: 1, duration: 1 });

// Prevent duplicate durations
// b2bSubscriptionPlanSchema.index({ duration: 1 }, { unique: true });

const B2BSubscriptionPlan =
  mongoose.models.B2BSubscriptionPlan ||
  mongoose.model('B2BSubscriptionPlan', b2bSubscriptionPlanSchema);

export default B2BSubscriptionPlan;

