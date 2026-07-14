import mongoose from 'mongoose';

const reelViewSchema = new mongoose.Schema(
  {
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

reelViewSchema.index({ reelId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ReelView', reelViewSchema);

