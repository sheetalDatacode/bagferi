import mongoose from 'mongoose';

const reelLikeSchema = new mongoose.Schema(
  {
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

reelLikeSchema.index({ reelId: 1, userId: 1 }, { unique: true });
reelLikeSchema.index({ reelId: 1 });

export default mongoose.model('ReelLike', reelLikeSchema);
