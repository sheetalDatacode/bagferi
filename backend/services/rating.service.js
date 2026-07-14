import Rating from '../models/Rating.model.js';
import mongoose from 'mongoose';

const VALID_TARGET_TYPES = ['product', 'lotslot', 'property', 'shop'];

/**
 * Submit or update rating. One rating per user per target.
 */
export const submitRating = async (userId, targetType, targetId, rating, comment = '') => {
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new Error('Invalid targetType. Must be product, lotslot, property, or shop.');
  }
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new Error('Invalid targetId.');
  }
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    throw new Error('Rating must be an integer between 1 and 5.');
  }

  const doc = await Rating.findOneAndUpdate(
    { userId, targetType, targetId },
    { rating: numRating, comment: (comment || '').trim().slice(0, 500) },
    { new: true, upsert: true }
  );
  return doc;
};

/**
 * Get aggregate rating for one target.
 */
export const getRatingSummary = async (targetType, targetId) => {
  if (!VALID_TARGET_TYPES.includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return { averageRating: 0, ratingCount: 0 };
  }
  const result = await Rating.aggregate([
    { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);
  if (!result.length) return { averageRating: 0, ratingCount: 0 };
  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    ratingCount: result[0].ratingCount,
  };
};

/**
 * Get aggregate ratings for multiple targets. Returns a map: idStr -> { averageRating, ratingCount }.
 */
export const getRatingSummaries = async (targetType, ids) => {
  if (!VALID_TARGET_TYPES.includes(targetType) || !Array.isArray(ids) || ids.length === 0) {
    return {};
  }
  const objectIds = ids
    .map((id) => (typeof id === 'string' ? id : id?.toString?.()))
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return {};

  const results = await Rating.aggregate([
    { $match: { targetType, targetId: { $in: objectIds } } },
    {
      $group: {
        _id: '$targetId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const map = {};
  results.forEach((r) => {
    const idStr = r._id.toString();
    map[idStr] = {
      averageRating: Math.round(r.averageRating * 10) / 10,
      ratingCount: r.ratingCount,
    };
  });
  return map;
};

/**
 * Get current user's rating for a target (for detail page).
 */
export const getUserRating = async (userId, targetType, targetId) => {
  if (!userId || !VALID_TARGET_TYPES.includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return null;
  }
  const doc = await Rating.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
  }).lean();
  if (!doc) return null;
  return { rating: doc.rating, comment: doc.comment };
}
