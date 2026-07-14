import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiTrash2,
    FiRefreshCw,
    FiInbox,
    FiAlertCircle,
    FiInfo,
    FiGift,
    FiSettings
} from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import B2BVendorLayout from '../components/Layout/B2BVendorLayout';
import { useNotifications } from '../../../shared/hooks/useNotifications';

const VendorNotifications = () => {
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
    const [refreshing, setRefreshing] = useState(false);

    const {
        notifications,
        unreadCount,
        loading,
        pagination,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications({
        autoFetch: true,
        filters: { page: 1, limit: 20 }
    });

    // Update filters when state changes
    useEffect(() => {
        const params = { page: 1, limit: 20 };
        if (filter === 'unread') params.isRead = false;
        if (filter === 'read') params.isRead = true;
        fetchNotifications(params);
    }, [filter, fetchNotifications]);

    // Refresh notifications
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications({ page: pagination.page, limit: 20 });
        await fetchUnreadCount();
        setRefreshing(false);
    };

    // Delete all read notifications
    const deleteAllRead = async () => {
        try {
            await api.delete('/vendor/notifications/read-all');
            fetchNotifications({ page: 1, limit: 20 });
            toast.success('All read notifications deleted');
        } catch (error) {
            toast.error('Failed to delete read notifications');
        }
    };

    // Get icon based on notification type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'system':
                return <FiSettings className="text-blue-500" />;
            case 'banner_booking':
                return <FiGift className="text-purple-500" />;
            case 'vendor_registration':
                return <FiCheckCircle className="text-green-500" />;
            case 'custom':
                return <FiInfo className="text-primary-500" />;
            case 'inquiry':
                return <FiInbox className="text-orange-500" />;
            case 'chat_message':
                return <FiInbox className="text-emerald-500" />;
            default:
                return <FiBell className="text-gray-500" />;
        }
    };

    // Format date
    const formatDate = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notifDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-end gap-2 mb-6">
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="Refresh"
                >
                    <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
                </button>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="px-3 py-2 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-100 transition-all flex items-center gap-2"
                    >
                        <FiCheckCircle size={14} />
                        Mark All Read
                    </button>
                )}
                {notifications.some(n => n.isRead) && (
                    <button
                        onClick={deleteAllRead}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                    >
                        <FiTrash2 size={14} />
                        Clear Read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                {['all', 'unread', 'read'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-bold mt-4 text-sm">Loading notifications...</p>
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FiInbox size={28} className="opacity-40" />
                        </div>
                        <p className="font-bold text-sm">No notifications</p>
                        <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {notifications?.map((notification, index) => (
                            <motion.div
                                key={notification._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: index * 0.03 }}
                                className={`flex items-start gap-4 p-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-all ${!notification.isRead ? 'bg-primary-50/30' : ''
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!notification.isRead ? 'bg-primary-100' : 'bg-gray-100'
                                    }`}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className={`text-sm font-bold ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {notification.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-2">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification._id)}
                                                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                            >
                                                <FiCheck size={12} />
                                                Mark Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification._id)}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                        >
                                            <FiTrash2 size={12} />
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Unread indicator */}
                                {!notification.isRead && (
                                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination */}
            {pagination?.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => fetchNotifications(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500 font-bold">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => fetchNotifications(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default VendorNotifications;
