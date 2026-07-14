import OTP from '../models/OTP.model.js';
import { isValidOTP } from '../utils/validators.util.js';
import redisService from './redis.service.js';

const OTP_EXPIRY_SECONDS = (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60;
const RATE_LIMIT_REQUESTS = parseInt(process.env.OTP_RATE_LIMIT_REQUESTS) || 10;
const RATE_LIMIT_WINDOW = (parseInt(process.env.OTP_RATE_LIMIT_WINDOW) || 15) * 60; // seconds

/**
 * Generate a 4-digit OTP and store it in Redis (Primary) or MongoDB (Fallback)
 */
export const generateOTP = async (identifier, type) => {
  try {
    if (!identifier || !type) throw new Error('Identifier and type are required');

    const normalizedIdentifier = identifier.toLowerCase().trim();
    const rateKey = `rate:otp:${type}:${normalizedIdentifier}`;
    const otpKey = `otp:${type}:${normalizedIdentifier}`;

    // 1. Check Rate Limiting using Redis
    let currentRequests = await redisService.get(rateKey);
    if (currentRequests && parseInt(currentRequests) >= RATE_LIMIT_REQUESTS) {
      const error = new Error(`Too many OTP requests. Please wait before requesting again.`);
      error.statusCode = 429;
      error.isRateLimitError = true;
      throw error;
    }

    // 2. Increment Request Count
    if (!currentRequests) {
      await redisService.set(rateKey, 1, RATE_LIMIT_WINDOW);
    } else {
      await redisService.incr(rateKey);
    }

    // 3. Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Store in Redis
    const success = await redisService.set(otpKey, { code, isUsed: false }, OTP_EXPIRY_SECONDS);

    // Fallback/Persistence to MongoDB (Optional based on user's architecture)
    // We'll keep it as fallback for MongoDB SOURCE OF TRUTH rule
    if (!success) {
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      await OTP.create({
        identifier: normalizedIdentifier,
        code,
        type,
        expiresAt,
        isUsed: false,
      });
    }

    return code;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (identifier, code, type) => {
  try {
    if (!identifier || !code || !type) throw new Error('Params missing');

    if (!isValidOTP(code)) {
      const error = new Error('Invalid OTP format');
      error.statusCode = 400;
      throw error;
    }

    const normalizedIdentifier = identifier.toLowerCase().trim();
    const otpKey = `otp:${type}:${normalizedIdentifier}`;

    // 1. Try Redis
    let otpData = await redisService.get(otpKey);

    if (otpData) {
      if (otpData.isUsed) {
        const error = new Error('OTP already used');
        error.statusCode = 400;
        throw error;
      }
      if (otpData.code !== code) {
        const error = new Error('Invalid OTP');
        error.statusCode = 400;
        throw error;
      }

      // Mark as used or delete
      await redisService.del(otpKey);
      return true;
    }

    // 2. Fallback to MongoDB
    const otp = await OTP.findOne({
      identifier: normalizedIdentifier,
      code,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      const error = new Error('Invalid or expired OTP');
      error.statusCode = 400;
      throw error;
    }

    otp.isUsed = true;
    await otp.save();

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (identifier, type) => {
  return await generateOTP(identifier, type);
};

