import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['product', 'lotslot', 'property', 'shop'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per user per target (user can update)
ratingSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
ratingSchema.index({ targetType: 1, targetId: 1 });

const Rating = mongoose.model('Rating', ratingSchema);
export default Rating;
