/**
 * Format price with currency symbol
 */
export const formatPrice = (price, currency = "₹") => {
  const numPrice = price ?? 0;
  return `${currency}${numPrice.toLocaleString("en-IN")}`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, length = 50) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Calculate discount percentage
 */
export const calculateDiscount = (originalPrice, discountedPrice) => {
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
};

/**
 * Mask phone number for display: show first 2 and last 2 digits.
 * Example: 9876543210 -> 98******10
 */
export const maskPhone = (phone, visible = 2) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length <= visible * 2) return digits;
  const start = digits.slice(0, visible);
  const end = digits.slice(-visible);
  const maskedMiddle = "*".repeat(digits.length - visible * 2);
  return `${start}${maskedMiddle}${end}`;
};

/**
 * Append logged-in user details to WhatsApp predefined message (raw text, not encoded).
 * Returns empty string if no user or no details.
 */
export const getWhatsAppUserDetailsSuffix = (user) => {
  if (!user) return "";
  const name = (user.name || "").trim();
  const email = (user.email || "").trim();
  const phone = (user.phone || user.mobile || user.phoneNumber || "").toString().trim();
  const city =
    (user.businessInfo &&
      user.businessInfo.address &&
      user.businessInfo.address.city) ||
    (user.businessInfo && user.businessInfo.city) ||
    (user.address && user.address.city) ||
    user.city ||
    "";

  if (!name && !email && !phone && !city) return "";
  let suffix = "\n\n---\n*My Details:*\n";
  if (name) suffix += `*Name:* ${name}\n`;
  if (email) suffix += `*Email:* ${email}\n`;
  if (city) suffix += `*City:* ${city}\n`;
  if (phone) suffix += `*Phone:* ${phone}`;
  return suffix.trimEnd();
};

/**
 * Get image URL (with fallback)
 */
export const getImageUrl = (image, fallback = "/placeholder.jpg") => {
  if (!image) return fallback;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_IMAGE_BASE_URL || ""}${image}`;
};

/**
 * Generate a placeholder image as SVG data URI
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Text to display on placeholder
 * @param {string} bgColor - Background color (hex or color name)
 * @param {string} textColor - Text color (hex or color name)
 * @returns {string} SVG data URI
 */
export const getPlaceholderImage = (
  width = 200,
  height = 200,
  text = "Image",
  bgColor = "#e5e7eb",
  textColor = "#9ca3af"
) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(width, height) / 8}" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Calculate total stock quantity for a product
 * Aggregates main product stock and all variant stocks
 */
export const calculateTotalStock = (product) => {
  if (!product) return 0;
  const mainStock = parseInt(product.stockQuantity) || 0;
  const primaryColorName = (product.primaryColorName || product?.variants?.defaultVariant?.color || '').toString().trim().toLowerCase();
  let variantSum = 0;
  let primaryVariantSum = 0;

  if (product.variants?.colorVariants && Array.isArray(product.variants.colorVariants)) {
    product.variants.colorVariants.forEach((cv) => {
      const cvColor = (cv.color || cv.colorName || '').toString().trim().toLowerCase();
      const cvTotal = cv.sizeVariants?.reduce((sizeAcc, sv) => sizeAcc + (parseInt(sv.stockQuantity) || 0), 0) || 0;
      variantSum += cvTotal;
      if (!primaryVariantSum && primaryColorName && cvColor === primaryColorName) {
        primaryVariantSum = cvTotal;
      }
    });
  }

  // Add root-level sizeVariants stock if present
  let rootSizeVariantSum = 0;
  if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
    rootSizeVariantSum = product.sizeVariants.reduce((acc, sv) => acc + (parseInt(sv.stockQuantity) || 0), 0);
  }

  // If root size variants exist, they represent the main stock
  const effectiveMainStock = rootSizeVariantSum > 0 ? rootSizeVariantSum : mainStock;

  return effectiveMainStock + Math.max(variantSum - primaryVariantSum, 0);
};

/**
 * Format date
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const validateStockCalculation = (product) => {
  const mainStock = parseInt(product?.stockQuantity) || 0;
  const totals = (product?.variants?.colorVariants || []).map((cv) => {
    return cv.sizeVariants?.reduce((acc, sv) => acc + (parseInt(sv.stockQuantity) || 0), 0) || 0;
  });
  const variantSum = totals.reduce((a, b) => a + b, 0);
  const total = calculateTotalStock(product);
  let isConsistent = false;
  const pName = (product?.primaryColorName || '').toString().trim().toLowerCase();
  if (pName) {
    const idx = (product?.variants?.colorVariants || []).findIndex((cv) => {
      const cvColor = (cv.color || cv.colorName || '').toString().trim().toLowerCase();
      return cvColor === pName;
    });
    const pSum = idx >= 0 ? totals[idx] : 0;
    isConsistent = total === mainStock + (variantSum - pSum);
  } else {
    isConsistent = variantSum === mainStock ? total === mainStock : total === mainStock + variantSum;
  }
  return { mainStock, variantSum, total, isConsistent };
};

/**
 * Format video URL for better compatibility (Cloudinary specific)
 */
export const formatVideoUrl = (url) => {
  if (!url) return "";
  if (url.includes("cloudinary.com")) {
    if (url.includes('/video/upload/')) {
      let formattedUrl = url;
      if (!url.includes('f_auto')) {
        formattedUrl = url.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
      }
      // Replace unsupported extensions with .mp4
      return formattedUrl.replace(/\.(avi|mov|mkv|flv|wmv)$/i, '.mp4');
    }
  }
  return url;
};

/**
 * Find the main representative variant of a product
 */
export const getMainProductVariant = (product) => {
  if (!product) return null;

  const allVariants = [];

  // 1. Collect root sizeVariants
  if (product.sizeVariants && product.sizeVariants.length > 0) {
    product.sizeVariants.forEach((sv, idx) => {
      allVariants.push({
        ...sv,
        sizeIndex: idx,
        colorIndex: null,
        color: null,
        isRootSize: true,
        priority: 1 // Higher priority for root sizes
      });
    });
  }

  // 2. Collect sizeVariants from colorVariants
  if (product.variants?.colorVariants && product.variants.colorVariants.length > 0) {
    const primaryColor = (product.primaryColorName || '').toLowerCase().trim();
    product.variants.colorVariants.forEach((cv, cIdx) => {
      const isPrimary = (cv.colorName || cv.color || '').toLowerCase().trim() === primaryColor;
      if (cv.sizeVariants && cv.sizeVariants.length > 0) {
        cv.sizeVariants.forEach((sv, sIdx) => {
          allVariants.push({
            ...sv,
            color: cv.colorName || cv.color,
            colorIndex: cIdx,
            sizeIndex: sIdx,
            isRootSize: false,
            priority: isPrimary ? 2 : 3 // Primary color is next in priority
          });
        });
      } else {
        // Color variant with no sizes
        allVariants.push({
          price: product.price,
          originalPrice: product.originalPrice,
          color: cv.colorName || cv.color,
          colorIndex: cIdx,
          size: null,
          sizeIndex: null,
          isRootSize: false,
          priority: isPrimary ? 2 : 3
        });
      }
    });
  }

  if (allVariants.length === 0) {
    return {
      price: product.price,
      originalPrice: product.originalPrice,
      size: null,
      color: null,
      isRootSize: true
    };
  }

  // 3. Sort by price (ASC), then by priority (ASC), then by original order
  allVariants.sort((a, b) => {
    const priceA = Number(a.price || product.price);
    const priceB = Number(b.price || product.price);
    if (priceA !== priceB) return priceA - priceB;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.colorIndex !== b.colorIndex) return (a.colorIndex ?? -1) - (b.colorIndex ?? -1);
    return (a.sizeIndex ?? -1) - (b.sizeIndex ?? -1);
  });

  // 4. Fallback/Default tie-breaker: if the chosen one is more expensive than default, reconsider
  // But usually we want absolute lowest price as per user request
  return allVariants[0];
};

/**
 * Generate Google Maps Search URL from vendor address
 */
export const getGoogleMapsUrl = (data) => {
  if (!data) return null;

  const explicitMapUrl = data?.location?.mapUrl || data?.address?.mapUrl || data?.mapUrl;
  if (explicitMapUrl && typeof explicitMapUrl === "string") {
    const raw = explicitMapUrl.trim();
    if (raw) {
      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^(www\.|maps\.google\.)/i.test(raw)) return `https://${raw}`;
      if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
      }
    }
  }

  // Extract address and location - handles both Vendor and Property objects
  const address = data.address || data.location || {};
  const geo = data.location || {}; // Top-level location for Vendor [lng, lat]

  // Prefer coordinates if available (from address.lat/lng or location.coordinates)
  const lat = address.lat ?? (geo.coordinates && geo.coordinates[1] !== 0 ? geo.coordinates[1] : null);
  const lng = address.lng ?? (geo.coordinates && geo.coordinates[0] !== 0 ? geo.coordinates[0] : null);

  if (lat && lng) {
    // If we have coordinates, use them for a precise pin
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  // Fallback to Address Search if no coordinates
  const name = data.storeName || data.title || data.name || '';
  const {
    street,
    area,
    market,
    landmark,
    city,
    pincode,
    state
  } = address;

  const queryParts = [
    street,
    landmark,
    market,
    area,
    name,
    city,
    state,
    pincode
  ].filter(part => part && typeof part === 'string' && part.trim() !== '');

  const query = queryParts.join(', ').trim();
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};
