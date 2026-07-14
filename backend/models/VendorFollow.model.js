import mongoose from 'mongoose';

const vendorFollowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
  },
  { timestamps: true }
);

// Unique constraint to prevent duplicate follows
vendorFollowSchema.index({ userId: 1, vendorId: 1 }, { unique: true });
vendorFollowSchema.index({ vendorId: 1 }); // Index for counting followers
vendorFollowSchema.index({ userId: 1 });   // Index for listing followed vendors

export default mongoose.model('VendorFollow', vendorFollowSchema);
