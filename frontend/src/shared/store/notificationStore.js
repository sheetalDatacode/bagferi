import { create } from 'zustand';
import { 
  getUnreadCount as fetchUnreadCount,
  getNotifications as fetchNotificationsApi,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  deleteNotification as deleteNotificationApi
} from '../services/notificationService';

/**
 * Global Notification Store
 * Syncs unread counts and notifications across all components
 */
export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    lastFetched: null,

    // Setters
    setNotifications: (notifications) => set({ notifications }),
    setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
    decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

    // Actions
    fetchUnreadCount: async () => {
        try {
            const count = await fetchUnreadCount();
            set({ unreadCount: count });
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    },

    fetchNotifications: async (filters = {}) => {
        set({ loading: true });
        try {
            const result = await fetchNotificationsApi(filters);
            set({ 
                notifications: result.notifications || [],
                pagination: result.pagination || get().pagination,
                lastFetched: new Date(),
                loading: false
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            set({ loading: false });
        }
    },

    markAsRead: async (id) => {
        try {
            await markAsReadApi(id);
            set((state) => ({
                notifications: state.notifications.map(n => 
                    n._id === id ? { ...n, isRead: true, readAt: new Date() } : n
                )
            }));
            // Fetch fresh count from server to ensure accuracy (esp. regarding excluded types)
            get().fetchUnreadCount();
            return true;
        } catch (error) {
            console.error('Error marking as read:', error);
            return false;
        }
    },

    markAllAsRead: async () => {
        try {
            await markAllAsReadApi();
            set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true, readAt: new Date() })),
                unreadCount: 0
            }));
            // Sync with server
            get().fetchUnreadCount();
            return true;
        } catch (error) {
            console.error('Error marking all as read:', error);
            return false;
        }
    },

    deleteNotification: async (id) => {
        try {
            const notif = get().notifications.find(n => n._id === id);
            const wasUnread = notif && !notif.isRead;
            
            await deleteNotificationApi(id);
            
            set((state) => ({
                notifications: state.notifications.filter(n => n._id !== id)
            }));
            // Fetch fresh count to ensure accuracy
            get().fetchUnreadCount();
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    },

    // Socket update handlers
    handleNewNotification: (notification) => {
        set((state) => {
            const exists = state.notifications.some(n => n._id === notification._id);
            if (exists) return state;
            return {
                notifications: [notification, ...state.notifications],
                unreadCount: state.unreadCount + 1
            };
        });
    },

    removeNotificationLocally: (id) => {
        set((state) => ({
            notifications: state.notifications.filter(n => n._id !== id)
        }));
        get().fetchUnreadCount();
    },

    handleNotificationRead: (notificationId) => {
        set((state) => {
            const notif = state.notifications.find(n => n._id === notificationId);
            const wasUnread = notif && !notif.isRead;
            return {
                notifications: state.notifications.map(n => 
                    n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
                ),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
            };
        });
    }
}));
