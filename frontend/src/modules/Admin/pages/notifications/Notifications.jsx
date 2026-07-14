import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiTrash2, FiCheck, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);

    // Optimize: Fetch unread count only on mount, not on every page change
    useEffect(() => {
        fetchUnreadCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    // Separate effect for page changes (notifications only)
    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/notifications?page=${page}&limit=10`);
            if (response.success) {
                setNotifications(response.data.notifications || []);
                setTotalPages(response.data.totalPages || 1);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/admin/notifications/unread-count');
            if (response.success) {
                setUnreadCount(response.data.unreadCount);
            }
        } catch (error) {
            // internal fail silent
        }
    };

    const markAsRead = async (id) => {
        try {
            const response = await api.put(`/admin/notifications/${id}/read`);
            if (response.success) {
                setNotifications(notifications.map(n =>
                    n._id === id ? { ...n, isRead: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
                toast.success('Marked as read');
            }
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await api.put('/admin/notifications/read-all');
            if (response.success) {
                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                toast.success('All notifications marked as read');
            }
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (id) => {
        try {
            const response = await api.delete(`/admin/notifications/${id}`);
            if (response.success) {
                setNotifications(notifications.filter(n => n._id !== id));
                toast.success('Notification deleted');
            }
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-sm sm:text-base text-gray-600">
                        You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        <FiCheckCircle /> Mark All Read
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading notifications...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`p-4 md:p-6 transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/40' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <FiBell size={20} />
                                        </div>
                                        <div>
                                            <h3 className={`text-base font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {notification.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                            <span className="text-xs text-gray-400 mt-2 block">
                                                {dayjs(notification.createdAt).fromNow()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification._id)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                title="Mark as read"
                                            >
                                                <FiCheck size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification._id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <FiBell size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Notifications</h3>
                        <p className="mt-1">You're all caught up!</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                    <button
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages || loading}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default Notifications;
