import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        artist: { type: String, required: true, trim: true },
        genre: { type: String, trim: true },
        duration: { type: Number }, // in seconds
        fileUrl: { type: String, required: true },
        publicId: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        isApprovedForReels: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model('Music', musicSchema);
