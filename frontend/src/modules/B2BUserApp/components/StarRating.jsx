import React from 'react';
import { FiStar } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';

/**
 * Display-only star rating. Shows average as filled stars (0-5).
 * @param {number} averageRating - 0 to 5
 * @param {number} ratingCount - optional, for " (12)" display
 * @param {'sm'|'md'} size - sm for cards, md for detail
 */
const StarRating = ({ averageRating = 0, ratingCount = 0, size = 'sm' }) => {
  const value = Math.min(5, Math.max(0, Number(averageRating) || 0));
  const starSize = size === 'sm' ? 10 : 14;
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';
  const filledColor = '#fbbf24';
  const emptyColor = '#e5e7eb';

  return (
    <div className={`flex items-center ${gap}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) =>
          value >= star ? (
            <FaStar key={star} size={starSize} style={{ color: filledColor }} />
          ) : (
            <FiStar key={star} size={starSize} style={{ color: emptyColor }} />
          )
        )}
      </div>
      {ratingCount > 0 && (
        <span className={`text-gray-500 font-bold ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>
          ({ratingCount})
        </span>
      )}
    </div>
  );
};

export default StarRating;
