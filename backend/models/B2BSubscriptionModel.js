import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2BSubscriptionPlan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "pending"],
      default: "pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    subscriptionDetails: {
      type: Object,
    },
    paymentDetails: {
      type: Object,
    },
    finalPayableAmount: {
      type: Number,
      required: true,
    },
    razorpaySubscriptionUrl: {
      type: String,
    },
    razorpaySubscriptionId: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("B2BSubscription", subscriptionSchema);
