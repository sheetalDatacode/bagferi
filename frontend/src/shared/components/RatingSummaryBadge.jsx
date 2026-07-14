import React, { useState, useEffect } from 'react';
import { getRatingSummary } from '../services/ratingService';
import StarRating from './StarRating';

const RatingSummaryBadge = ({ targetType, targetId, className = '' }) => {
    const [summary, setSummary] = useState({ averageRating: 0, ratingCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!targetType || !targetId) {
            setLoading(false);
            return;
        }
        
        let isMounted = true;
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const data = await getRatingSummary(targetType, targetId);
                if (isMounted && data) {
                    setSummary({
                        averageRating: data.averageRating || 0,
                        ratingCount: data.ratingCount || 0
                    });
                }
            } catch (error) {
                console.error(`Error fetching rating summary for ${targetType} ${targetId}:`, error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSummary();
        return () => {
            isMounted = false;
        };
    }, [targetType, targetId]);

    if (loading) {
        return <div className={`animate-pulse w-24 h-4 bg-gray-100 rounded-md ${className}`}></div>;
    }

    if (summary.ratingCount === 0) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <StarRating rating={0} interactive={false} size={14} />
                <span className="text-xs text-gray-400 font-medium">(0)</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <StarRating rating={summary.averageRating} interactive={false} size={14} />
            <span className="text-xs font-bold text-gray-700">{summary.averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500 font-medium">({summary.ratingCount})</span>
        </div>
    );
};

export default RatingSummaryBadge;
