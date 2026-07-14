import Notification from '../models/Notification.model.js';
import mongoose from 'mongoose';

class NotificationService {
  /**
   * Create a single notification
   * @param {Object} notificationData - Notification data
   * @param {Object} io - Socket.io instance (optional, for real-time updates)
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData, io = null) {
    try {
      // Map recipientType to recipientTypeModel
      const recipientTypeModelMap = {
        user: 'User',
        vendor: 'Vendor',
        admin: 'Admin',
      };

      const notification = new Notification({
        ...notificationData,
        recipientTypeModel: recipientTypeModelMap[notificationData.recipientType],
      });

      const savedNotification = await notification.save();

      // Emit socket event if io instance is provided
      if (io) {
        const roomName = `notifications_${notificationData.recipientId}_${notificationData.recipientType}`;
        io.to(roomName).emit('new_notification', savedNotification);
      }

      return savedNotification;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Create multiple notifications
   * @param {Array} notificationsArray - Array of notification data
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Array>} Created notifications
   */
  async createBulkNotifications(notificationsArray, io = null) {
    try {
      const recipientTypeModelMap = {
        user: 'User',
        vendor: 'Vendor',
        admin: 'Admin',
      };

      const notifications = notificationsArray.map((notif) => ({
        ...notif,
        recipientTypeModel: recipientTypeModelMap[notif.recipientType],
      }));

      const savedNotifications = await Notification.insertMany(notifications);

      // Emit socket events for each notification
      if (io) {
        savedNotifications.forEach((notification) => {
          const roomName = `notifications_${notification.recipientId}_${notification.recipientType}`;
          io.to(roomName).emit('new_notification', notification);
        });
      }

      return savedNotifications;
    } catch (error) {
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }
  }

  /**
   * Get notifications with pagination and filters
   * @param {String} recipientId - Recipient ID
   * @param {String} recipientType - Recipient type (user/vendor/admin)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Notifications with pagination
   */
  async getNotifications(recipientId, recipientType, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        isRead,
        type,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const query = {
        recipientId: new mongoose.Types.ObjectId(recipientId),
        recipientType,
      };

      if (isRead !== undefined) {
        query.isRead = isRead === 'true' || isRead === true;
      }

      if (type && type !== 'all') {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Notification.countDocuments(query),
      ]);

      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Get unread notification count
   * @param {String} recipientId - Recipient ID
   * @param {String} recipientType - Recipient type
   * @returns {Promise<Number>} Unread count
   */
  async getUnreadCount(recipientId, recipientType) {
    try {
      const count = await Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(recipientId),
        recipientType,
        isRead: false,
        type: { $ne: 'chat_message' }, // Exclude chat messages from unread count
      });

      return count;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   * @param {String} recipientId - Recipient ID (for validation)
   * @param {String} recipientType - Recipient type (for validation)
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, recipientId, recipientType, io = null) {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          recipientId: new mongoose.Types.ObjectId(recipientId),
          recipientType,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      // Emit socket event
      if (io) {
        const roomName = `notifications_${recipientId}_${recipientType}`;
        io.to(roomName).emit('notification_read', { notificationId, isRead: true });
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   * @param {String} recipientId - Recipient ID
   * @param {String} recipientType - Recipient type
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(recipientId, recipientType, io = null) {
    try {
      const result = await Notification.updateMany(
        {
          recipientId: new mongoose.Types.ObjectId(recipientId),
          recipientType,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      // Emit socket event
      if (io) {
        const roomName = `notifications_${recipientId}_${recipientType}`;
        io.to(roomName).emit('all_notifications_read', { count: result.modifiedCount });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   * @param {String} notificationId - Notification ID
   * @param {String} recipientId - Recipient ID (for validation)
   * @param {String} recipientType - Recipient type (for validation)
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Object>} Deleted notification
   */
  async deleteNotification(notificationId, recipientId, recipientType, io = null) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipientId: new mongoose.Types.ObjectId(recipientId),
        recipientType,
      });

      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      // Emit socket event
      if (io) {
        const roomName = `notifications_${recipientId}_${recipientType}`;
        io.to(roomName).emit('notification_deleted', { notificationId });
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Delete all read notifications
   * @param {String} recipientId - Recipient ID
   * @param {String} recipientType - Recipient type
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Object>} Delete result
   */
  async deleteAllRead(recipientId, recipientType, io = null) {
    try {
      const result = await Notification.deleteMany({
        recipientId: new mongoose.Types.ObjectId(recipientId),
        recipientType,
        isRead: true,
      });

      // Emit socket event
      if (io) {
        const roomName = `notifications_${recipientId}_${recipientType}`;
        io.to(roomName).emit('read_notifications_deleted', { count: result.deletedCount });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to delete read notifications: ${error.message}`);
    }
  }

  /**
   * Send notification to multiple recipients based on target criteria
   * @param {Object} notificationData - Base notification data (title, message, type, actionUrl)
   * @param {String} target - Target audience ('all', 'users', 'vendors', 'admins', 'specific')
   * @param {Array} recipientIds - Specific recipient IDs (if target is 'specific')
   * @param {Object} io - Socket.io instance (optional)
   * @returns {Promise<Object>} Result with count of notifications sent
   */
  async sendBulkNotification(notificationData, target, recipientIds = [], io = null) {
    try {
      const User = (await import('../models/User.model.js')).default;
      const Vendor = (await import('../models/Vendor.model.js')).default;
      const Admin = (await import('../models/Admin.model.js')).default;

      let recipients = [];

      if (target === 'specific' && recipientIds.length > 0) {
        // Send to specific recipients
        const users = await User.find({ _id: { $in: recipientIds }, isActive: true, currentMarketplace: 'b2b' }).select('_id').lean();
        const vendors = await Vendor.find({ _id: { $in: recipientIds }, isActive: true, vendorType: 'b2b' }).select('_id').lean();
        const admins = await Admin.find({ _id: { $in: recipientIds }, isActive: true }).select('_id').lean();

        recipients = [
          ...users.map((u) => ({ id: u._id, type: 'user' })),
          ...vendors.map((v) => ({ id: v._id, type: 'vendor' })),
          ...admins.map((a) => ({ id: a._id, type: 'admin' })),
        ];
      } else if (target === 'users' || target === 'all') {
        // Send to all active B2B users
        const users = await User.find({ isActive: true, currentMarketplace: 'b2b' }).select('_id').lean();
        recipients = users.map((u) => ({ id: u._id, type: 'user' }));
      }

      if (target === 'vendors' || target === 'all') {
        // Send to all active B2B vendors
        const vendors = await Vendor.find({ isActive: true, vendorType: 'b2b' }).select('_id').lean();
        recipients = [
          ...recipients,
          ...vendors.map((v) => ({ id: v._id, type: 'vendor' })),
        ];
      }

      if (target === 'admins') {
        // Send to all active admins
        const admins = await Admin.find({ isActive: true }).select('_id').lean();
        recipients = admins.map((a) => ({ id: a._id, type: 'admin' }));
      }


      if (recipients.length === 0) {
        throw new Error('No recipients found for the specified target');
      }

      // Create notifications for all recipients
      const notifications = recipients.map((recipient) => ({
        recipientId: recipient.id,
        recipientType: recipient.type,
        type: notificationData.type || 'system',
        title: notificationData.title,
        message: notificationData.message,
        actionUrl: notificationData.actionUrl,
        metadata: notificationData.metadata || {},
      }));

      const savedNotifications = await this.createBulkNotifications(notifications, io);

      return {
        success: true,
        count: savedNotifications.length,
        recipients: recipients.length,
      };
    } catch (error) {
      throw new Error(`Failed to send bulk notification: ${error.message}`);
    }
  }
}

export default new NotificationService();

