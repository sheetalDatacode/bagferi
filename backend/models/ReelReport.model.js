import mongoose from 'mongoose';

const reelReportSchema = new mongoose.Schema(
  {
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
    reporterType: { type: String, enum: ['user', 'vendor'], required: true },
    reason: { type: String, required: true, trim: true },
    comment: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
    actionTaken: { type: String, default: null }, 
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

reelReportSchema.index({ reelId: 1 });
reelReportSchema.index({ status: 1 });

export default mongoose.model('ReelReport', reelReportSchema);
