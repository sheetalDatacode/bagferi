import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCategory', default: null },
    categoryName: { type: String, trim: true, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    uploaderType: { type: String, enum: ['vendor', 'user'], required: true },
    uploaderName: { type: String, trim: true, default: '' },
    videoUrl: { type: String, required: true },
    originalVideoUrl: { type: String, default: null },
    reelType: {
      type: String,
      enum: ['upload', 'link'],
      default: 'upload',
    },
    externalLinkType: {
      type: String,
      enum: ['youtube', 'direct', 'cloudinary'],
      default: 'cloudinary',
    },
    videoPublicId: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    durationSeconds: { type: Number, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    rejectReason: { type: String, trim: true, default: null },
    youtubeVideoId: { type: String, default: null },
    youtubePlaylistId: { type: String, default: null },
    youtubeUploadFailed: { type: Boolean, default: false },
    youtubeUploadError: { type: String, default: null },
    viewCount: { type: Number, default: 0 },
    isCopyrighted: { type: Boolean, default: false },
    audioStatus: {
      type: String,
      enum: ['original', 'replaced'],
      default: 'original',
    },
    musicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Music', default: null },
    price: { type: Number, default: 0 },
    minimum: { type: String, trim: true, default: '' },
    isYouTubeLinkValid: { type: Boolean, default: true },
    youtubeLinkStatus: {
      type: String,
      enum: ['active', 'deleted', 'private', 'unknown'],
      default: 'active',
    },
  },
  { timestamps: true }
);

reelSchema.index({ status: 1, approvedAt: -1 });
reelSchema.index({ uploaderId: 1, createdAt: -1 });
reelSchema.index({ categoryId: 1 });
reelSchema.index({ categoryName: 1 });
reelSchema.index({ createdAt: -1 });

export default mongoose.model('Reel', reelSchema);
