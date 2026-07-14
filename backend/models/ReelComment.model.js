import mongoose from 'mongoose';

const reelCommentSchema = new mongoose.Schema(
  {
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reelCommentSchema.index({ reelId: 1, createdAt: -1 });

export default mongoose.model('ReelComment', reelCommentSchema);
