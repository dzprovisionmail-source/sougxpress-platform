import { useCallback, useEffect, useState } from "react";

import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import {
  getMerchantNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeMerchantNotifications,
  type MerchantNotification,
} from "@/services/merchant-notifications.service";

export function useMerchantNotifications() {
  const { userId } = useCurrentUserId();
  const [notifications, setNotifications] = useState<MerchantNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotifications(await getMerchantNotifications(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchNotifications();
    if (!userId) return;
    const channel = subscribeMerchantNotifications(userId, () => void fetchNotifications());
    return () => {
      void channel.unsubscribe();
    };
  }, [fetchNotifications, userId]);

  const markRead = async (id: string) => {
    if (!userId) return;
    if (await markNotificationRead(userId, id)) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() } : n)));
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    if (await markAllNotificationsRead(userId)) {
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? now })));
    }
  };

  return { notifications, loading, unreadCount: notifications.filter((n) => !n.is_read).length, refresh: fetchNotifications, markRead, markAllRead };
}
