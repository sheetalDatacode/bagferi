import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      uppercase: true,
      maxlength: [100, 'SKU cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    price: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      trim: true,
      default: 'Pcs',
    },
    image: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    images: [String],
    imagesPublicIds: [String],
    stock: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'pre_order'],
      default: 'in_stock',
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minimumOrderQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      index: true,
    },
    bulkPricing: {
      type: [{
        minQty: { type: Number, required: true },
        price: { type: Number, required: true }
      }],
      default: []
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    attributes: {
      type: [
        {
          attributeName: {
            type: String,
            trim: true,
          },
          name: {
            type: String,
            trim: true,
          },
          value: {
            type: mongoose.Schema.Types.Mixed,
          },
        },
      ],
      default: [],
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to automatically set stock status based on stockQuantity
productSchema.pre('save', function (next) {
  // Only auto-update if it's not pre_order
  if (this.stock !== 'pre_order') {
    if (this.stockQuantity === 0) {
      this.stock = 'out_of_stock';
    } else if (this.stockQuantity <= 10) {
      this.stock = 'low_stock';
    } else {
      this.stock = 'in_stock';
    }
  }
  next();
});

// Pre-update middleware for findOneAndUpdate operations
productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  // Handle stock updates based on stockQuantity
  // If stock is specifically being set to 'pre_order', don't override it
  const isPreOrder = update.stock === 'pre_order' || (update.$set && update.$set.stock === 'pre_order');

  if (!isPreOrder && update.stockQuantity !== undefined) {
    if (update.stockQuantity === 0) {
      update.stock = 'out_of_stock';
    } else if (update.stockQuantity <= 10) {
      update.stock = 'low_stock';
    } else {
      update.stock = 'in_stock';
    }
  }

  if (!isPreOrder && update.$set && update.$set.stockQuantity !== undefined) {
    if (update.$set.stockQuantity === 0) {
      update.$set.stock = 'out_of_stock';
    } else if (update.$set.stockQuantity <= 10) {
      update.$set.stock = 'low_stock';
    } else {
      update.$set.stock = 'in_stock';
    }
  }

  next();
});

// Indexes
productSchema.index({ name: 1 });
productSchema.index({ vendorId: 1, isActive: 1 });
productSchema.index({ stock: 1, stockQuantity: 1 });
productSchema.index({ isActive: 1, isVisible: 1 });
productSchema.index({ vendorId: 1, isVisible: 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', brandName: 'text', category: 'text', subcategory: 'text' });

export default mongoose.model('Product', productSchema);

