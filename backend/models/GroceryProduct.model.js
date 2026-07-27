import mongoose from 'mongoose';

const groceryProductSchema = new mongoose.Schema(
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
    mrp: { type: Number, min: 0 },
    price: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      trim: true,
      default: 'Pcs',
    },
    weight: {
      type: String,
      trim: true,
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
    videoLink: {
      type: String,
      trim: true,
      default: null,
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    expiryDate: {
      type: Date,
      default: null,
    },
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
    discountPercent: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },

    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroceryCategory',
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroceryCategory',
      index: true,
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

groceryProductSchema.pre('save', function (next) {
  if (this.stock !== 'pre_order') {
    if (this.stockQuantity === 0) {
      this.stock = 'out_of_stock';
    } else if (this.stockQuantity <= 10) {
      this.stock = 'low_stock';
    } else {
      this.stock = 'in_stock';
    }
  }

  // Calculate discount percent
  if (this.mrp && this.price && this.mrp > this.price) {
    this.discountPercent = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  } else {
    this.discountPercent = 0;
  }

  next();
});

// Pre-update middleware for findOneAndUpdate operations
groceryProductSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
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

  // Handle discount percent calculation for updates
  const setUpdate = update.$set || update;
  if (setUpdate.price !== undefined || setUpdate.mrp !== undefined) {
    // If mrp or price is updated, we need to calculate it.
    // However, findOneAndUpdate doesn't give us the full document, so we might need to rely on both being passed or set to 0.
    // For safety, if both are present in the update:
    if (setUpdate.mrp && setUpdate.price && setUpdate.mrp > setUpdate.price) {
      setUpdate.discountPercent = Math.round(((setUpdate.mrp - setUpdate.price) / setUpdate.mrp) * 100);
    } else if (setUpdate.price >= setUpdate.mrp || (!setUpdate.mrp && setUpdate.price)) {
      setUpdate.discountPercent = 0;
    }
  }

  next();
});

export default mongoose.model('GroceryProduct', groceryProductSchema);
