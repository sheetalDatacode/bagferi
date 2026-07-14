import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';

/**
 * Media Controller
 * Handles standalone media uploads to Cloudinary
 */

export const uploadMedia = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file provided'
        });
    }

    const folder = req.body.folder || 'misc';
    const resourceType = req.body.resourceType || 'auto';

    try {
        const result = await uploadToCloudinary(req.file.buffer, folder, {
            resource_type: resourceType,
            timeout: 120000 // 2 minutes timeout for large files
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Upload failed'
        });
    }
});
