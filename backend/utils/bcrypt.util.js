import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
export const hashPassword = async (password) => {
  try {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare plain password with hashed password
 * @param {String} password - Plain text password
 * @param {String} hashedPassword - Hashed password from database
 * @returns {Promise<Boolean>} True if passwords match
 */
export const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      return false;
    }
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Failed to compare passwords');
  }
};

