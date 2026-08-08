import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'items.productModel',
    },
    productModel: {
      type: String,
      required: true,
      enum: ['Product', 'GroceryProduct'],
      default: 'Product',
    },
    module: {
      type: String,
      enum: ['fashion', 'grocery'],
      default: 'fashion',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    size: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    selectedVariants: {
      type: Map,
      of: String,
      default: {},
    },
    selectedImageUrl: {
      type: String,
      default: null,
    },
    selected: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
