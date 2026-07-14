// Image optimization utilities for different contexts

// Image loading priorities
export const IMAGE_PRIORITIES = {
  HERO: 'high',
  PRODUCT_DETAIL: 'high',
  PRODUCT_LISTING: 'low',
  THUMBNAIL: 'low'
};

// Image formats by priority
export const IMAGE_FORMATS = {
  high: ['webp', 'avif', 'png', 'jpg'],
  low: ['webp', 'png', 'jpg']
};

/**
 * Injects Cloudinary transformations into a URL
 * Adds f_auto,q_auto and optional resizing/cropping
 */
const injectCloudinaryTransformations = (url, transformations = 'f_auto,q_auto') => {
  if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  // Prevent double injection
  if (url.includes('f_auto') || url.includes('q_auto')) {
    return url;
  }

  return url.replace('/upload/', `/upload/${transformations}/`);
};

// Get optimized image path based on context
export const getOptimizedImagePath = (originalPath, context = 'listing') => {
  if (!originalPath || typeof originalPath !== 'string') return originalPath;

  // Don't optimize data URIs or non-cloudinary URLs
  if (originalPath.startsWith('data:') || !originalPath.includes('cloudinary.com')) {
    return originalPath;
  }

  let transformations = 'f_auto,q_auto';

  switch (context) {
    case 'hero':
      transformations += ',w_1200,c_limit';
      break;
    case 'product-detail':
      transformations += ',w_800,c_limit';
      break;
    case 'product-listing':
      transformations += ',w_400,c_fill,g_auto';
      break;
    case 'thumbnail':
      transformations += ',w_150,h_150,c_fill,g_auto';
      break;
    default:
      break;
  }

  return injectCloudinaryTransformations(originalPath, transformations);
};

// Get loading priority based on context
export const getImagePriority = (context) => {
  switch (context) {
    case 'hero':
    case 'product-detail':
      return 'high';
    case 'product-listing':
    case 'thumbnail':
    default:
      return 'low';
  }
};

// Get image loading strategy
export const getImageLoadingStrategy = (context) => {
  switch (context) {
    case 'hero':
      return { loading: 'eager', fetchpriority: 'high', decoding: 'sync' };
    case 'product-detail':
      return { loading: 'eager', fetchpriority: 'high', decoding: 'async' };
    case 'product-listing':
    case 'thumbnail':
    default:
      return { loading: 'lazy', fetchpriority: 'low', decoding: 'async' };
  }
};

// Generate responsive image sources
export const getResponsiveImageSources = (originalPath, context) => {
  if (!originalPath) return null;

  const basePath = originalPath.replace(/\.(png|jpg|jpeg|webp|avif)$/i, '');
  const sources = [];

  // For high-priority images, provide multiple formats
  if (context === 'hero' || context === 'product-detail') {
    sources.push(
      { src: `${basePath}.avif`, type: 'image/avif' },
      { src: `${basePath}.webp`, type: 'image/webp' },
      { src: `${basePath}.png`, type: 'image/png' }
    );
  } else {
    // For low-priority, just WebP fallback
    sources.push(
      { src: `${basePath}.webp`, type: 'image/webp' },
      { src: `${basePath}.png`, type: 'image/png' }
    );
  }

  return sources;
};
