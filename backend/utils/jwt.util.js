import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (userId, email, role, etc.)
 * @param {String} expiresIn - Token expiration time (default: 30d)
 * @returns {String} JWT token
 */
export const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      issuer: 'dealing-india-api',
      audience: 'dealing-india-client',
    });
  } catch (error) {
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify and decode JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'dealing-india-api',
      audience: 'dealing-india-client',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Generate refresh token (for future use if needed)
 * @param {Object} payload - Token payload
 * @returns {String} Refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d', // Refresh tokens last longer
      issuer: 'dealing-india-api',
      audience: 'dealing-india-client',
    });
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
};

