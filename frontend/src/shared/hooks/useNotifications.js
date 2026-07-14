import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { initializeSocket, getSocket } from '../utils/socket';

/**
 * Custom hook for managing notifications with real-time updates
 * @param {Object} options - Hook options
 * @param {Boolean} options.autoFetch - Auto-fetch notifications on mount (default: true)
 * @param {Object} options.filters - Initial filters for notifications
 * @param {Boolean} options.enableSocket - Enable socket.io real-time updates (default: true)
 * @returns {Object} Notification state and methods
 */
export const useNotifications = (options = {}) => {
  const {
    autoFetch = true,
    filters: initialFilters = {},
    enableSocket = true,
  } = options;

  const {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    removeNotificationLocally,
    handleNewNotification,
    handleNotificationRead
  } = useNotificationStore();

  const socketInitialized = useRef(false);
  const filtersRef = useRef(initialFilters);

  // Get appropriate token based on current route
  const getToken = () => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      return localStorage.getItem('admin-token');
    } else if (path.startsWith('/b2b-vendor')) {
      return localStorage.getItem('b2b-vendor-token');
    } else if (path.startsWith('/vendor')) {
      return localStorage.getItem('vendor-token');
    }
    return localStorage.getItem('token');
  };

  // Initialize socket connection
  useEffect(() => {
    if (!enableSocket) return;

    const token = getToken();
    if (!token) return;

    if (!socketInitialized.current) {
      const socket = initializeSocket(token);
      if (!socket) return;
      socketInitialized.current = true;

      // Listen for new notifications
      socket.on('new_notification', (notification) => {
        handleNewNotification(notification);
      });

      // Listen for notification read updates
      socket.on('notification_read', ({ notificationId }) => {
        handleNotificationRead(notificationId);
      });

      // Listen for all notifications read
      socket.on('all_notifications_read', () => {
        markAllAsRead(); // Implicitly clears state locally
      });

      // Listen for notification deleted
      socket.on('notification_deleted', ({ notificationId }) => {
        removeNotificationLocally(notificationId);
      });

      // Listen for read notifications deleted
      socket.on('read_notifications_deleted', () => {
        fetchNotifications(filtersRef.current);
      });
    }

    return () => {
      // Socket logic remains persistent
    };
  }, [enableSocket, handleNewNotification, handleNotificationRead, markAllAsRead, deleteNotification, removeNotificationLocally, fetchNotifications]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications(filtersRef.current);
      fetchUnreadCount();
    }
  }, [autoFetch, fetchNotifications, fetchUnreadCount]);

  // Poll for unread count updates (fallback if socket disconnected)
  useEffect(() => {
    if (!enableSocket) return;

    const interval = setInterval(() => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        fetchUnreadCount();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [enableSocket, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: () => {
      fetchNotifications(filtersRef.current);
      fetchUnreadCount();
    },
  };
};

