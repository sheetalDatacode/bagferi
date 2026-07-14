import notificationService from '../services/notification.service.js';

/**
 * Get vendor notifications
 * GET /api/vendor/notifications
 */
export const getVendorNotifications = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            isRead: req.query.isRead,
            type: req.query.type,
            search: req.query.search,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };

        const result = await notificationService.getNotifications(vendorId, 'vendor', filters);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get unread notification count
 * GET /api/vendor/notifications/unread-count
 */
export const getUnreadCount = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const count = await notificationService.getUnreadCount(vendorId, 'vendor');

        return res.status(200).json({
            success: true,
            data: { unreadCount: count },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark notification as read
 * PUT /api/vendor/notifications/:id/read
 */
export const markAsRead = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const { id } = req.params;
        const io = req.app.get('io');

        const notification = await notificationService.markAsRead(id, vendorId, 'vendor', io);

        return res.status(200).json({
            success: true,
            data: notification,
            message: 'Notification marked as read',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read
 * PUT /api/vendor/notifications/read-all
 */
export const markAllAsRead = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const io = req.app.get('io');

        const result = await notificationService.markAllAsRead(vendorId, 'vendor', io);

        return res.status(200).json({
            success: true,
            data: { modifiedCount: result.modifiedCount },
            message: 'All notifications marked as read',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete notification
 * DELETE /api/vendor/notifications/:id
 */
export const deleteNotification = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const { id } = req.params;
        const io = req.app.get('io');

        await notificationService.deleteNotification(id, vendorId, 'vendor', io);

        return res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete all read notifications
 * DELETE /api/vendor/notifications/read-all
 */
export const deleteAllRead = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const io = req.app.get('io');

        const result = await notificationService.deleteAllRead(vendorId, 'vendor', io);

        return res.status(200).json({
            success: true,
            data: { deletedCount: result.deletedCount },
            message: 'All read notifications deleted',
        });
    } catch (error) {
        next(error);
    }
};
