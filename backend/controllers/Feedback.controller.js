import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import Feedback from '../models/Feedback.model.js';

/**
 * Create a new feedback
 * @route POST /api/feedback
 * @access Private
 */
export const createFeedback = asyncHandler(async (req, res) => {
    const { subject, message, role } = req.body;

    if (!subject || !message || !role) {
        return res.status(400).json({
            success: false,
            message: 'Subject, message and role are required'
        });
    }

    const feedbackData = {
        subject,
        message,
        role,
        status: 'pending'
    };

    if (role === 'user') {
        feedbackData.userId = req.userDoc._id;
    } else if (role === 'vendor') {
        feedbackData.vendorId = req.userDoc._id;
    }

    const feedback = await Feedback.create(feedbackData);

    res.status(201).json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully'
    });
});

/**
 * Get all feedbacks for admin
 * @route GET /api/feedback/admin/all
 * @access Private/Admin
 */
export const getAdminFeedbacks = asyncHandler(async (req, res) => {
    const { status, role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (role) query.role = role;

    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find(query)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'name storeName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    res.status(200).json({
        success: true,
        data: feedbacks,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Update feedback status
 * @route PATCH /api/feedback/admin/:id/status
 * @access Private/Admin
 */
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'reviewed'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status'
        });
    }

    const feedback = await Feedback.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    );

    if (!feedback) {
        return res.status(404).json({
            success: false,
            message: 'Feedback not found'
        });
    }

    res.status(200).json({
        success: true,
        data: feedback,
        message: 'Feedback status updated'
    });
});
