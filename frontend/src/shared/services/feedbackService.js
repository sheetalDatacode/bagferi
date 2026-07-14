import api from '../utils/api';

/**
 * Submit feedback
 * @param {Object} feedbackData - { subject, message, role }
 */
export const submitFeedback = async (feedbackData) => {
    try {
        const response = await api.post('/feedback', feedbackData);
        return response;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Get all feedbacks (Admin only)
 * @param {Object} params - { status, role, page, limit }
 */
export const getAdminFeedbacks = async (params = {}) => {
    try {
        const response = await api.get('/feedback/admin/all', { params });
        return response;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Update feedback status (Admin only)
 * @param {string} id - Feedback ID
 * @param {string} status - 'pending' or 'reviewed'
 */
export const updateFeedbackStatus = async (id, status) => {
    try {
        const response = await api.patch(`/feedback/admin/${id}/status`, { status });
        return response;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
