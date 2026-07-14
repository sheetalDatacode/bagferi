import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const StarRating = ({ 
    rating = 0, 
    interactive = false, 
    onRate, 
    size = 16, 
    color = '#FBBF24', 
    emptyColor = '#E5E7EB',
    className = ''
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleMouseEnter = (index) => {
        if (interactive) setHoverRating(index);
    };

    const handleMouseLeave = () => {
        if (interactive) setHoverRating(0);
    };

    const handleClick = (index) => {
        if (interactive && onRate) {
            onRate(index);
        }
    };

    const currentRating = hoverRating || rating;

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {[1, 2, 3, 4, 5].map((index) => {
                const filled = currentRating >= index;
                return (
                    <button
                        key={index}
                        type="button"
                        className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} flex items-center justify-center`}
                        onMouseEnter={() => handleMouseEnter(index)}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClick(index);
                        }}
                        disabled={!interactive}
                    >
                        {filled ? (
                            <FaStar size={size} color={color} />
                        ) : (
                            <FaRegStar size={size} color={emptyColor} />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default StarRating;
