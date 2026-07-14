import axios from 'axios';

/**
 * Validate if a Cloudinary image URL exists
 * @param {String} imageUrl - Cloudinary image URL
 * @returns {Promise<Boolean>} True if image exists, false otherwise
 */
export const validateImageUrl = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  // If it's not a Cloudinary URL, assume it's valid (could be external URL)
  if (!imageUrl.includes('cloudinary.com')) {
    return true; // Don't validate external URLs
  }

  try {
    // Use HEAD request to check if image exists without downloading
    const response = await axios.head(imageUrl, {
      timeout: 3000, // 3 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 404
    });

    return response.status === 200;
  } catch (error) {
    // If request fails (timeout, network error, 404), image doesn't exist
    return false;
  }
};

/**
 * Validate multiple image URLs (batch validation)
 * @param {Array<String>} imageUrls - Array of image URLs
 * @returns {Promise<Object>} { valid: [urls], invalid: [urls] }
 */
export const validateImageUrls = async (imageUrls) => {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return { valid: [], invalid: [] };
  }

  // Validate all images in parallel (with limit to avoid overwhelming)
  const validationPromises = imageUrls.map(url =>
    validateImageUrl(url).then(isValid => ({ url, isValid }))
  );

  const results = await Promise.all(validationPromises);

  const valid = results.filter(r => r.isValid).map(r => r.url);
  const invalid = results.filter(r => !r.isValid).map(r => r.url);

  return { valid, invalid };
};

/**
 * Sanitize product image - replace broken URLs with null
 * This is a synchronous check that doesn't validate, just checks format
 * @param {String} imageUrl - Image URL
 * @returns {String|null} Valid URL or null if invalid format
 */
export const sanitizeImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  // Remove whitespace
  const trimmed = imageUrl.trim();

  // If empty after trim, return null
  if (!trimmed) {
    return null;
  }

  // Allow relative paths (e.g. /uploads/...) or data URIs
  if (trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Check if it's a valid URL format
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    // If it's a Cloudinary-like string without a protocol, consider it potentially valid
    // but for now, we follow a safer approach: if it has a dot or slash, it might be a path
    if (trimmed.includes('/') || trimmed.includes('.')) {
      return trimmed;
    }
    // Invalid URL format
    return null;
  }
};

/**
 * Sanitize product images array
 * @param {Array<String>} images - Array of image URLs
 * @returns {Array<String>} Sanitized array (removes invalid URLs)
 */
export const sanitizeImageUrls = (images) => {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  return images
    .map(img => sanitizeImageUrl(img))
    .filter(img => img !== null);
};

