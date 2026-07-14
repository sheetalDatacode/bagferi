import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: true,
      length: 6,
      validate: {
        validator: function (v) {
          return /^\d{6}$/.test(v);
        },
        message: 'OTP code must be exactly 6 digits',
      },
    },
    type: {
      type: String,
      required: true,
      enum: ['email_verification', 'password_reset'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
otpSchema.index({ identifier: 1, type: 1, isUsed: 1 });
otpSchema.index({ identifier: 1, type: 1, expiresAt: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;

