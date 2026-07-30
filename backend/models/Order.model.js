import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
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
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    module: {
      type: String,
      enum: ['fashion', 'grocery'],
      default: 'fashion',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    advancePayment: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      areaName: String,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Cancelled', 'Dispatched', 'Completed'],
      default: 'Pending',
    },
    assignedStaff: {
      name: String,
      mobile: String,
      assignedAt: Date
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Online'],
      default: 'Online',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Advance Paid', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    deliveryOtp: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: null,
    },
    refundMethod: {
      type: String,
      enum: ['wallet', 'bank_transfer', null],
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ['na', 'pending', 'processing', 'completed'],
      default: 'na',
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
