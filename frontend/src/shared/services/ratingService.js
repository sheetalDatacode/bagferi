import api from '../utils/api';
import toast from '../utils/toast';

export const submitRating = async (targetType, targetId, rating, comment = '') => {
    try {
        const response = await api.post('/rating', { targetType, targetId, rating, comment });
        if (response.success) {
            toast.success('Rating submitted successfully');
            return response.data;
        }
        return null;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to submit rating');
        throw error;
    }
};

export const getRatingSummary = async (targetType, targetId) => {
    try {
        const response = await api.get(`/rating/summary`, {
            params: { targetType, targetId }
        });
        if (response.success) {
            return response.data;
        }
        return { averageRating: 0, ratingCount: 0 };
    } catch (error) {
        console.error('Error fetching rating summary:', error);
        return { averageRating: 0, ratingCount: 0 };
    }
};

export const getUserRating = async (targetType, targetId) => {
    try {
        const response = await api.get(`/rating/user`, {
            params: { targetType, targetId }
        });
        if (response.success) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user rating:', error);
        return null;
    }
};
