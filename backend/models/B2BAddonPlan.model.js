import mongoose from 'mongoose';

const b2bAddonPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Add-on name is required'],
      trim: true,
      maxlength: [100, 'Add-on name cannot exceed 100 characters'],
    },
    featureType: {
      type: String,
      required: [true, 'Feature type is required'],
      enum: ['reels', 'products', 'lot_slot', 'property', 'enquiry', 'jobs'], // Extensible keys
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
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
  },
  {
    timestamps: true,
  }
);

const B2BAddonPlan =
  mongoose.models.B2BAddonPlan ||
  mongoose.model('B2BAddonPlan', b2bAddonPlanSchema);

export default B2BAddonPlan;
