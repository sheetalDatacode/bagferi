import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientTypeModel',
    },
    recipientType: {
      type: String,
      required: true,
      enum: ['user', 'vendor', 'admin'],
    },
    recipientTypeModel: {
      type: String,
      required: true,
      enum: ['User', 'Vendor', 'Admin'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'system',
        'custom',
        'vendor_registration',
        'banner_booking',
        'secure_deal_request',
        'secure_deal_status',
        'reel_status',
        'reel_moderation',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ recipientId: 1, recipientType: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

