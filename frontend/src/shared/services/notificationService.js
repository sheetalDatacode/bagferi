import api from '../utils/api';

/**
 * Get the appropriate notification endpoint based on role
 * @param {String} role - User role ('user', 'vendor', 'admin')
 * @returns {String} API endpoint
 */
const getEndpoint = (role = null) => {
  // Try to determine role from path if not provided
  if (!role) {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      return '/admin/notifications';
    } else if (path.startsWith('/b2b-vendor') || path.startsWith('/vendor')) {
      // B2B vendors use the same vendor notification endpoints
      return '/vendor/notifications';
    }
  } else {
    if (role === 'admin') {
      return '/admin/notifications';
    } else if (role === 'vendor' || role === 'b2b-vendor') {
      return '/vendor/notifications';
    }
  }
  return '/user/notifications';
};

/**
 * Get notifications (role-aware)
 * @param {Object} filters - Filter options
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Notifications with pagination
 */
export const getNotifications = async (filters = {}, role = null) => {
  try {
    const endpoint = getEndpoint(role);

    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead);
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await api.get(`${endpoint}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Number>} Unread count
 */
export const getUnreadCount = async (role = null) => {
  try {
    const baseEndpoint = getEndpoint(role);
    const endpoint = `${baseEndpoint}/unread-count`;

    const response = await api.get(endpoint);
    return response.data?.unreadCount || 0;
  } catch (error) {
    // Suppress network errors (backend might not be running)
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      // Silently return 0 - backend not available
      return 0;
    }
    return 0; // Return 0 on error to prevent UI issues
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId, role = null) => {
  try {
    const baseEndpoint = getEndpoint(role);
    const endpoint = `${baseEndpoint}/${notificationId}/read`;

    const response = await api.put(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Update result
 */
export const markAllAsRead = async (role = null) => {
  try {
    const baseEndpoint = getEndpoint(role);
    const endpoint = `${baseEndpoint}/read-all`;

    const response = await api.put(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Delete result
 */
export const deleteNotification = async (notificationId, role = null) => {
  try {
    const baseEndpoint = getEndpoint(role);
    const endpoint = `${baseEndpoint}/${notificationId}`;

    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all read notifications
 * @param {String} role - User role (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Delete result
 */
export const deleteAllRead = async (role = null) => {
  try {
    const baseEndpoint = getEndpoint(role);
    const endpoint = `${baseEndpoint}/read-all`;

    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    throw error;
  }
};

