import mongoose from 'mongoose';

const bannerSlotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    bannerType: {
      type: String,
      enum: ['hero', 'b2b'],
      required: true,
      default: 'hero',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingStructure: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerBooking',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for slotNumber + bannerType
bannerSlotSchema.index({ slotNumber: 1, bannerType: 1 }, { unique: true });

const BannerSlot = mongoose.model('BannerSlot', bannerSlotSchema);

export default BannerSlot;
