import cloudinary from '../config/cloudinary.js';

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {String} folderName - Folder name in Cloudinary (e.g., 'categories', 'products')
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} { secure_url, public_id }
 */
export const uploadToCloudinary = async (buffer, folderName, options = {}) => {
  try {
    if (!buffer) {
      throw new Error('No file buffer provided for upload');
    }

    // Check Cloudinary configuration explicitly
    const cloudinaryConfig = cloudinary.config();
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      throw new Error('Cloudinary configuration is missing or invalid');
    }

    return new Promise((resolve, reject) => {
      // Ensure folder name is provided and clean
      const folder = folderName || 'general';

      const uploadOptions = {
        folder: folder,
        resource_type: 'auto',
        fetch_format: 'auto',
        quality: 'auto',
        ...options,
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Error]:', error);
            return reject(new Error(`Cloudinary Upload Failed: ${error.message}`));
          }
          if (!result || !result.secure_url) {
            console.error('[Cloudinary Result Error]: No secure_url in result');
            return reject(new Error('Cloudinary Upload Failed: No URL returned from server'));
          }

          // Return only what is needed, focusing on secure_url
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            // duration is available for video uploads; undefined for images
            duration: result.duration,
          });
        }
      );

      // Write buffer to stream
      try {
        const streamifier = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        uploadStream.end(streamifier);
      } catch (streamErr) {
        console.error('[Cloudinary Stream Error]:', streamErr);
        reject(new Error(`Failed to process image stream: ${streamErr.message}`));
      }
    });
  } catch (error) {
    console.error('[Cloudinary Utility Error]:', error);
    throw error;
  }
};

/**
 * Upload base64 string to Cloudinary
 * @param {String} base64String - Base64 data URL
 * @param {String} folderName - Folder name in Cloudinary
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} { secure_url, public_id }
 */
export const uploadBase64ToCloudinary = async (base64String, folderName, options = {}) => {
  try {
    if (!base64String) {
      throw new Error('No base64 data provided for upload');
    }

    // Basic base64 validation
    if (typeof base64String !== 'string') {
      throw new Error('Invalid base64 data. Must be a string.');
    }

    const isImage = base64String.startsWith('data:image');
    const isPDF = base64String.startsWith('data:application/pdf');
    // Add other non-image types if needed (e.g. docs)
    const isDoc = base64String.startsWith('data:application/msword') ||
      base64String.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    if (!isImage && !isPDF && !isDoc) {
      // If it's already a URL, return it as is but this shouldn't happen in a strict upload flow
      if (base64String.startsWith('http')) {
        return { secure_url: base64String, public_id: null };
      }
      // If it doesn't have a known prefix but looks like base64, we'll try to upload it anyway
      // but log a warning
      if (!base64String.includes(';base64,')) {
        throw new Error('Invalid file format. Must be a valid base64 data URL (Image or PDF).');
      }
    }

    // Determine resource_type based on mime type
    // Requirement: PDFs must be uploaded as resource_type: "image" to allow inline viewing.
    // Cloudinary 'auto' usually correctly identifies PDFs as image-like resources.
    // We explicitly avoid 'raw' for PDFs now.

    let resourceType = 'auto'; // Default

    // Explicitly set image for PDF to ensure it's viewable
    if (isPDF) {
      resourceType = 'image';
    }
    // Doc/Docx still needs to be raw usually as they can't be rendered inline by Cloudinary unless converted
    else if (isDoc) {
      resourceType = 'raw';
    }

    const uploadOptions = {
      folder: folderName || 'general',
      resource_type: resourceType,
      ...options,
    };

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);

    if (!result || !result.secure_url) {
      throw new Error('Cloudinary upload failed: No secure_url returned');
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type || resourceType // Return the actual resource type used
    };
  } catch (error) {
    console.error('[Cloudinary Base64 Upload Error]:', error);
    // Re-throw with a more user-friendly message if it's a Cloudinary specific error
    if (error.http_code) {
      throw new Error(`Cloudinary Error (${error.http_code}): ${error.message}`);
    }
    throw error;
  }
};

/**
 * Upload a URL (e.g. a transformed Cloudinary video URL) to a new Cloudinary resource.
 * This effectively "freezes" transformations into a new, stable file.
 * @param {String} url - The URL to upload
 * @param {String} folderName - Folder name in Cloudinary
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} { secure_url, public_id }
 */
export const uploadUrlToCloudinary = async (url, folderName, options = {}) => {
  try {
    if (!url) {
      throw new Error('No URL provided for upload');
    }

    const uploadOptions = {
      folder: folderName || 'general',
      resource_type: 'video', // Specifically for reels
      ...options,
    };

    const result = await cloudinary.uploader.upload(url, uploadOptions);

    if (!result || !result.secure_url) {
      throw new Error('Cloudinary URL upload failed: No secure_url returned');
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration,
    };
  } catch (error) {
    console.error('[Cloudinary URL Upload Error]:', error);
    if (error.http_code) {
      throw new Error(`Cloudinary Error (${error.http_code}): ${error.message}`);
    }
    throw error;
  }
};

/**
 * Delete resource from Cloudinary by public_id
 * @param {String} publicId - Cloudinary public_id
 * @param {String} resourceType - Cloudinary resource type ('image', 'video', 'raw')
 * @returns {Promise<Boolean>} Success status
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) {
      return false; // No public_id to delete
    }

    // If public_id is a full URL, extract the public_id
    const extractedPublicId = extractPublicIdFromUrl(publicId) || publicId;

    const result = await cloudinary.uploader.destroy(extractedPublicId, {
      resource_type: resourceType,
    });

    return result.result === 'ok';
  } catch (error) {
    // Log error but don't throw - deletion failures shouldn't break the flow
    console.error(`Failed to delete from Cloudinary (public_id: ${publicId}):`, error.message);
    return false;
  }
};

/**
 * Delete multiple resources from Cloudinary
 * @param {Array<String>} publicIds - Array of Cloudinary public_ids
 * @param {String} resourceType - Cloudinary resource type
 * @returns {Promise<Object>} { deleted: number, failed: number }
 */
export const deleteMultipleFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    const deletePromises = publicIds
      .filter(id => id) // Filter out null/undefined
      .map(publicId => {
        const extractedPublicId = extractPublicIdFromUrl(publicId) || publicId;
        return cloudinary.uploader.destroy(extractedPublicId, {
          resource_type: resourceType,
        }).catch(error => {
          console.error(`Failed to delete ${extractedPublicId}:`, error.message);
          return { result: 'not found' };
        });
      });

    const results = await Promise.all(deletePromises);
    const deleted = results.filter(r => r.result === 'ok').length;
    const failed = results.length - deleted;

    return { deleted, failed };
  } catch (error) {
    console.error('Failed to delete multiple images from Cloudinary:', error.message);
    return { deleted: 0, failed: publicIds.length };
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} public_id or null if not a Cloudinary URL
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Check if it's a Cloudinary URL
  const cloudinaryPattern = /cloudinary\.com\/.*\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mov|avi)/i;
  const match = url.match(cloudinaryPattern);

  if (match && match[1]) {
    // Remove folder prefix if present
    return match[1];
  }

  return null;
};

/**
 * Check if a string is a base64 data URL
 * @param {String} str - String to check
 * @returns {Boolean} True if base64 data URL
 */
export const isBase64DataUrl = (str) => {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return str.startsWith('data:image/') || str.startsWith('data:application/');
};

/**
 * Create a signed URL for a Cloudinary resource
 * @param {String} publicId - Public ID of the resource
 * @param {Object} options - URL options
 * @returns {String} Signed URL
 */
export const getSignedUrl = (publicId, options = {}) => {
  try {
    if (!publicId) return null;

    // Separate URL generation options
    // Default to 'image' if not specified, BUT check if we can infer 'raw' from extension in publicId if present?
    // User wants "raw" used for PDFs.

    const urlOptions = {
      sign_url: true, // Generate signed URL
      secure: true,   // Use HTTPS
      resource_type: 'image', // Default to image
      ...options
    };

    // Cloudinary SDK handles flags as an array or string
    // If we want forced download (attachment)
    if (options.download) {
      // Append 'attachment' to existing flags or create new
      const currentFlags = urlOptions.flags ? (Array.isArray(urlOptions.flags) ? urlOptions.flags : [urlOptions.flags]) : [];

      // remove any existing attachment flags to avoid duplicates/conflicts
      const filteredFlags = currentFlags.filter(f => !f.toString().startsWith('attachment'));

      if (options.attachment_filename) {
        filteredFlags.push(`attachment:${options.attachment_filename}`);
      } else {
        filteredFlags.push('attachment');
      }

      urlOptions.flags = filteredFlags;
      delete urlOptions.download;
      delete urlOptions.attachment_filename;
    }

    // Extract just the public ID if a full URL was passed by mistake
    const extractedId = extractPublicIdFromUrl(publicId) || publicId;

    return cloudinary.url(extractedId, urlOptions);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

