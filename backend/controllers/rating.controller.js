import * as ratingService from '../services/rating.service.js';
import redisService from '../services/redis.service.js';

/**
 * POST /api/rating
 * Body: { targetType, targetId, rating, comment? }
 * Auth: user only
 */
export const submitRating = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userDoc?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { targetType, targetId, rating, comment } = req.body;
    if (!targetType || !targetId || rating == null) {
      return res.status(400).json({
        success: false,
        message: 'targetType, targetId and rating are required.',
      });
    }
    const doc = await ratingService.submitRating(userId, targetType, targetId, rating, comment || '');
    // Invalidate vendor cache when shop rating changes so landing/catalog show updated stars
    if (targetType === 'shop' && targetId) {
      try {
        await redisService.clearPattern('vendors:list:b2b*');
        await redisService.del(`vendor:details:${targetId}`);
      } catch (e) {
        console.error('Redis cache invalidation after rating:', e);
      }
    } else if (targetType === 'product' && targetId) {
      try {
        await redisService.clearPattern(`product:details:*${targetId}*`);
      } catch (e) {
        console.error('Redis cache invalidation after rating:', e);
      }
    }
    res.status(200).json({
      success: true,
      message: 'Rating saved.',
      data: { rating: doc.rating, comment: doc.comment },
    });
  } catch (error) {
    if (error.message?.includes('Invalid')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/rating/summary?targetType=product&targetId=...
 * Public
 */
export const getSummary = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: 'targetType and targetId are required.',
      });
    }
    const summary = await ratingService.getRatingSummary(targetType, targetId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rating/user?targetType=product&targetId=...
 * Auth: user only (optional – returns null if not rated)
 */
export const getUserRating = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userDoc?._id;
    if (!userId) {
      return res.status(200).json({ success: true, data: null });
    }
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: 'targetType and targetId are required.',
      });
    }
    const userRating = await ratingService.getUserRating(userId, targetType, targetId);
    res.status(200).json({ success: true, data: userRating });
  } catch (error) {
    next(error);
  }
};
