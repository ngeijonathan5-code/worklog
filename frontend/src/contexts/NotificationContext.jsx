import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../api.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      const data = await notificationApi.list({ unreadOnly });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const createNotification = useCallback(async (notificationData) => {
    const newNotification = await notificationApi.create(notificationData);
    setNotifications(prev => [newNotification, ...prev]);
    if (!notificationData.isGlobal || notificationData.recipientId) {
      // If it's for current user or global, update count
      await fetchUnreadCount();
    }
    return newNotification;
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (id) => {
    await notificationApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      createNotification,
      markAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}