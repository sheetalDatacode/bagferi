import mongoose from 'mongoose';

const vendorContactClickSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    clickType: {
      type: String,
      enum: ['call', 'whatsapp', 'map'],
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['user', 'vendor', 'admin', 'superadmin', null],
      default: null,
    },
    // YYYY-MM-DD in Asia/Kolkata timezone
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    // Optional context (not required for dedupe rule)
    itemType: {
      type: String,
      enum: ['product', 'lotslot', 'property', 'vendor', 'reel', 'unknown'],
      default: 'unknown',
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // True only for the FIRST click of the day for this user+vendor combo
    // Subsequent clicks on the same day are raw analytics only (not billed)
    isNewEnquiry: {
      type: Boolean,
      default: false,
      index: true,
    },
    enquiryConsumed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

vendorContactClickSchema.index(
  { vendorId: 1, clickType: 1, dateKey: 1, userId: 1 },
  { name: 'vendor_clicktype_date_user' }
);

// Fast dedup lookup: has this user contacted this vendor today?
vendorContactClickSchema.index(
  { vendorId: 1, userId: 1, dateKey: 1 },
  { name: 'vendor_user_date_dedup' }
);

// For vendor dashboard enquiry stats
vendorContactClickSchema.index(
  { vendorId: 1, isNewEnquiry: 1, dateKey: 1 },
  { name: 'vendor_enquiry_date' }
);

export default mongoose.model('VendorContactClick', vendorContactClickSchema);

