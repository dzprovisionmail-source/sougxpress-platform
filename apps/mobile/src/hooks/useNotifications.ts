import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import {
  type AppNotification,
  type NotificationFilter,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/services/notification.service";

export function useNotifications(filter: NotificationFilter = "all") {
  const { userId } = useCurrentUserId();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (isPullToRefresh = false) => {
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isPullToRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await getNotifications(userId, filter);
      if (!result.error) setNotifications(result.data);
      else console.error("Error fetching notifications:", result.error);

      setLoading(false);
      setRefreshing(false);
    },
    [filter, userId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToNotifications(userId, () => {
      void refresh();
    });

    return channel;
  }, [refresh, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read && !item.read_at).length,
    [notifications],
  );

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return false;
      const result = await markNotificationRead(userId, notificationId);
      if (result.error) {
        console.error("Error marking notification as read:", result.error);
        return false;
      }
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true, read_at: now } : item,
        ),
      );
      return true;
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return false;
    const result = await markAllNotificationsRead(userId);
    if (result.error) {
      console.error("Error marking all notifications as read:", result.error);
      return false;
    }
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? now })),
    );
    return true;
  }, [userId]);

  const remove = useCallback(
    async (notificationId: string) => {
      if (!userId) return false;
      const result = await deleteNotification(userId, notificationId);
      if (result.error) {
        console.error("Error deleting notification:", result.error);
        return false;
      }
      setNotifications((current) => current.filter((item) => item.id !== notificationId));
      return true;
    },
    [userId],
  );

  return {
    userId,
    notifications,
    loading,
    refreshing,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    remove,
  };
}
