import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    area: { type: String, trim: true }, // Added area field
    market: { type: String, trim: true }, // Market field for B2B vendors
    landmark: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }, // For B2B vendors (India-specific)
    country: { type: String, trim: true, default: 'India' },
    mapUrl: { type: String, trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      validate: {
        validator: function (v) {
          const cleaned = v.replace(/[\s\-\(\)]/g, '');
          return /^(\+?\d{10,15})$/.test(cleaned);
        },
        message: 'Please enter a valid phone number',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [200, 'Store name cannot exceed 200 characters'],
    },
    storeDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Store description cannot exceed 1000 characters'],
    },
    address: {
      type: addressSchema,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['vendor'],
      default: 'vendor',
    },
    vendorType: {
      type: String,
      enum: ['b2b'], // Only B2B is supported now
      default: 'b2b',
    },
    businessType: {
      type: String,
      trim: true,
      default: 'Textile', // Default for backward compatibility if needed, but will be set during registration
    },
    businessTypeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessType',
    },
    mfgOfWork: {
      type: String,
      trim: true,
      default: '',
    },
    // B2B-specific fields
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      set: v => (v === '' || v === null || v === undefined) ? undefined : v,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          // GST format: 2 numbers, 5 alphabets, 4 numbers, 1 alphabet, 1 number/alphabet, 'Z', 1 number/alphabet
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Please enter a valid GST number',
      },
      index: {
        unique: true,
        sparse: true,
      }
    },
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      publicId: { type: String },
      type: { type: String }, // MIME type (e.g., 'application/pdf', 'image/jpeg', 'video/mp4')
      uploadedAt: { type: Date, default: Date.now },
    }],
    bankDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    storeLogo: {
      type: String,
      default: null,
    },

    // Analytics for tracking user engagement
    analytics: {
      callClicks: { type: Number, default: 0 },
      whatsappClicks: { type: Number, default: 0 },
      mapClicks: { type: Number, default: 0 },
    },
    fcmTokens: {
      type: [String],
      default: []
    },
    fcmTokenMobile: {
      type: [String],
      default: []
    },

    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorSubscription',
      default: null,
    },
    zohoContactId: {
      type: String,
      trim: true,
      default: null,
    },
    // Location field for geospatial queries
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere', default: [0, 0] } // [lng, lat]
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    referredByCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email already has unique: true in field definition)
vendorSchema.index({ phone: 1 }, { unique: true });
vendorSchema.index({ status: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ role: 1 });
vendorSchema.index({ vendorType: 1 }); // Index for B2B vendor queries
vendorSchema.index({ 'address.lat': 1, 'address.lng': 1 });
vendorSchema.index({ location: '2dsphere' });

// Pre-save middleware: Ensure B2B vendors have commissionRate = 0
// B2B vendors pay subscription fees, NOT commission
vendorSchema.pre('save', function (next) {
  // If vendorType is 'b2b', ensure commissionRate is 0
  if (this.vendorType === 'b2b') {
    this.commissionRate = 0;
  }
  next();
});

// Pre-update middleware: Prevent commission updates for B2B vendors
vendorSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();

  // Check if commissionRate is being updated
  if (update && update.$set && update.$set.commissionRate !== undefined) {
    // If updating commission, we need to check vendorType
    // This will be validated in the service layer for better error handling
  }

  next();
});

// Remove password from JSON output
vendorSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;

