import Music from '../models/Music.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';

/**
 * Admin: Add music to library
 * POST /api/admin/music
 */
export const addMusic = asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Music file is required' });
    }

    const { title, artist, genre } = req.body;
    if (!title || !artist) {
        return res.status(400).json({ success: false, message: 'Title and artist are required' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'music_library', {
        resource_type: 'video', // Cloudinary uses video resource type for audio too
    });

    const music = await Music.create({
        title,
        artist,
        genre,
        duration: uploadResult.duration,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
    });

    res.status(201).json({
        success: true,
        message: 'Music added successfully',
        data: { music },
    });
});

/**
 * Admin: List all music
 * GET /api/admin/music
 */
export const adminListMusic = asyncHandler(async (req, res) => {
    const music = await Music.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: { music } });
});

/**
 * Admin: Toggle music active status
 * PATCH /api/admin/music/:id/toggle
 */
export const toggleMusic = asyncHandler(async (req, res) => {
    const music = await Music.findById(req.params.id);
    if (!music) {
        return res.status(404).json({ success: false, message: 'Music not found' });
    }
    music.isActive = !music.isActive;
    await music.save();
    res.status(200).json({ success: true, message: `Music ${music.isActive ? 'enabled' : 'disabled'}`, data: { music } });
});

/**
 * Admin: Delete music
 * DELETE /api/admin/music/:id
 */
export const deleteMusic = asyncHandler(async (req, res) => {
    const music = await Music.findById(req.params.id);
    if (!music) {
        return res.status(404).json({ success: false, message: 'Music not found' });
    }

    if (music.publicId) {
        await deleteFromCloudinary(music.publicId, 'video').catch(() => { });
    }

    await Music.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Music deleted successfully' });
});

/**
 * Vendor/Public: List approved music
 * GET /api/music/approved
 */
export const listApprovedMusic = asyncHandler(async (req, res) => {
    const music = await Music.find({ isActive: true, isApprovedForReels: true }).sort({ title: 1 }).lean();
    res.status(200).json({ success: true, data: { music } });
});
