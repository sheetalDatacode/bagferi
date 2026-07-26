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
    subSubcategory: {
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
  next();
});

export default mongoose.model('GroceryProduct', groceryProductSchema);
