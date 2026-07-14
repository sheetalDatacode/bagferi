import mongoose from 'mongoose';

const youtubePlaylistMapSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCategory', default: null },
    categoryName: { type: String, required: true, trim: true, unique: true },
    youtubePlaylistId: { type: String, required: true, trim: true },
    youtubePlaylistTitle: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);


export default mongoose.model('YouTubePlaylistMap', youtubePlaylistMapSchema);
