import { useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiX, FiChevronRight, FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiMessageCircle, FiVideo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateTime } from '../../utils/adminHelpers';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../../shared/hooks/useNotifications';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../../shared/hooks/useScrollLock';

const NotificationWindow = ({ isOpen, onClose, position = 'right' }) => {
  const navigate = useNavigate();
  const windowRef = useRef(null);

  // Lock scroll when notifications panel is open
  useScrollLock(isOpen);

  // Determine role from path
  const path = window.location.pathname;
  const isB2BVendor = path.startsWith('/b2b-vendor');
  const isVendor = path.startsWith('/vendor') && !path.startsWith('/b2b-vendor');
  const isAdmin = path.startsWith('/admin');

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    autoFetch: isOpen,
    enableSocket: true,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (windowRef.current && !windowRef.current.contains(event.target)) {
        // Check if click is not on the notification button
        if (!event.target.closest('[data-notification-button]')) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      order_placed: FiPackage,
      order_confirmed: FiCheckCircle,
      order_shipped: FiTruck,
      order_delivered: FiCheckCircle,
      order_cancelled: FiXCircle,
      payment_success: FiCheckCircle,
      payment_failed: FiXCircle,
      new_order: FiPackage,
      order_status_change: FiTruck,
      return_request: FiPackage,
      review: FiCheckCircle,
      system: FiBell,
      offer: FiBell,
      promotion: FiBell,
      inquiry: FiMessageCircle,
      chat_message: FiMessageCircle,
      reel_status: FiVideo,
    };
    return iconMap[type] || FiBell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      order_placed: 'bg-blue-100 text-blue-600',
      order_confirmed: 'bg-green-100 text-green-600',
      order_shipped: 'bg-purple-100 text-purple-600',
      order_delivered: 'bg-green-100 text-green-600',
      order_cancelled: 'bg-red-100 text-red-600',
      payment_failed: 'bg-yellow-100 text-yellow-600',
      payment_success: 'bg-green-100 text-green-600',
      new_order: 'bg-blue-100 text-blue-600',
      order_status_change: 'bg-purple-100 text-purple-600',
      return_request: 'bg-yellow-100 text-yellow-600',
      review: 'bg-green-100 text-green-600',
      system: 'bg-gray-100 text-gray-600',
      offer: 'bg-orange-100 text-orange-600',
      promotion: 'bg-pink-100 text-pink-600',
      inquiry: 'bg-primary-100 text-primary-600',
      chat_message: 'bg-primary-100 text-primary-600',
      reel_status: 'bg-pink-100 text-pink-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    } else if (notification.metadata?.conversationId) {
      // For B2B vendor inquiries, navigate to messages page
      if (isB2BVendor) {
        navigate('/b2b-vendor/messages');
      } else {
        navigate(notification.actionUrl || '/b2b/inquiries');
      }
      onClose();
    } else if (notification.orderId) {
      const orderId = notification.orderId._id || notification.orderId;
      if (isB2BVendor || isVendor) {
        navigate(`/vendor/orders/${orderId}`);
      } else if (isAdmin) {
        navigate(`/admin/orders/all-orders`);
      }
      onClose();
    } else {
      // Fallback for B2B vendors to notifications page
      if (isB2BVendor) {
        navigate('/b2b-vendor/notifications');
      }
      onClose();
    }
  };

  const getViewAllUrl = () => {
    if (isB2BVendor) {
      return '/b2b-vendor/notifications';
    } else if (isVendor) {
      return '/vendor/notifications';
    } else if (isAdmin) {
      return '/admin/notifications';
    }
    return '/app/notifications';
  };

  const positionClasses = {
    right: 'right-0',
    left: 'left-0',
  };

  // Show only recent notifications (first 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[9999] lg:hidden"
          />

          {/* Notification Window */}
          <motion.div
            ref={windowRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed lg:absolute ${positionClasses[position]} top-[calc(4rem-40px)] lg:top-full lg:-mt-[38px] right-[11px] lg:-right-[5px] z-[10000] w-[calc(100vw-2rem)] sm:w-96 max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden`}
            style={{ willChange: 'transform' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto scrollbar-admin">
              {loading && recentNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">Loading notifications...</p>
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <FiBell className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">No notifications</p>
                  <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/30' : ''
                          }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(
                              notification.type
                            )}`}
                          >
                            <Icon className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-800 text-sm">
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(notification.createdAt)}
                                  </span>
                                  {notification.orderId && (
                                    <span className="text-xs font-medium text-primary-600">
                                      {notification.orderId?.orderCode || notification.orderId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <FiCheck className="text-sm" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification._id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiX className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {recentNotifications.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
                <button
                  onClick={() => {
                    navigate(getViewAllUrl());
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <span>View all notifications</span>
                  <FiChevronRight className="text-base" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationWindow;
