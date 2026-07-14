/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  // Strict check to prevent common typos like .comm or .commm
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate phone number format (supports international format)
 * @param {String} phone - Phone number to validate
 * @returns {Boolean} True if valid phone
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it starts with + and has 10-15 digits, or just 10-15 digits
  const phoneRegex = /^(\+?\d{10,15})$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} { valid: Boolean, message: String }
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true, message: 'Password is valid' };
};

/**
 * Sanitize string input to prevent injection attacks
 * @param {String} input - Input to sanitize
 * @returns {String} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate OTP code format (6-digit numeric)
 * @param {String} code - OTP code to validate
 * @returns {Boolean} True if valid OTP format
 */
export const isValidOTP = (code) => {
  if (!code) return false;
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(code);
};

