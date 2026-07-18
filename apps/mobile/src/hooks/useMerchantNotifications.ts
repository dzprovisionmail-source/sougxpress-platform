import { useState, useEffect, useCallback } from "react";
import {
  getMerchantNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeMerchantNotifications,
  MerchantNotification,
} from "../services/merchant-notifications.service";

export function useMerchantNotifications() {
  const [notifications, setNotifications] = useState<MerchantNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const data = await getMerchantNotifications();
    setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const sub = subscribeMerchantNotifications(fetchNotifications);
    return () => {
      sub.unsubscribe();
    };
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    const ok = await markNotificationRead(id);
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllRead = async () => {
    const ok = await markAllNotificationsRead();
    if (ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    loading,
    unreadCount,
    refresh: fetchNotifications,
    markRead,
    markAllRead,
  };
}
