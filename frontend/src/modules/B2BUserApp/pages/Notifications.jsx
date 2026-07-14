import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiPackage, FiMessageCircle, FiTag, FiClock } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { getNotifications, markAsRead } from '../../../shared/services/notificationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const result = await getNotifications({}, 'user');
            if (result.success) {
                setNotifications(result.data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await markAsRead(id, 'user');
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const getIcon = (type) => {
        if (type === 'system') return FiBell;
        return FiBell;
    };

    const getColor = (type) => {
        if (type === 'system') return 'text-gray-600 bg-gray-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Notifications" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-2">
                <div className="space-y-3 mt-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh]">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-500 font-medium">Loading notifications...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notif, idx) => {
                            const Icon = getIcon(notif.type);
                            return (
                                <motion.div
                                    key={notif._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                                    className={`bg-white p-4 rounded-2xl border ${notif.isRead ? 'border-gray-100' : 'border-primary-100 shadow-sm'} flex gap-4 cursor-pointer hover:shadow-md transition-shadow`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notif.type)}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-sm font-bold ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</h3>
                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
                                                <FiClock size={10} />
                                                {notif.createdAt ? dayjs(notif.createdAt).fromNow() : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{notif.message}</p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                                    )}
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                                <FiBell size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700">No notifications yet</h3>
                            <p className="text-sm text-gray-500 mt-2">We'll notify you about your inquiries here.</p>
                        </div>
                    )}
                </div>
            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Notifications;
