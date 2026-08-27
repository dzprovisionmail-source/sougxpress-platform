import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead as markSharedAllRead,
  markNotificationRead as markSharedRead,
  subscribeToNotifications,
  type AppNotification,
} from "@/services/notification.service";

export type MerchantNotification = AppNotification & { is_read: boolean };

export async function getMerchantNotifications(userId: string): Promise<MerchantNotification[]> {
  const { data, error } = await getNotifications(userId);
  if (error) {
    console.error("Error fetching merchant notifications:", error);
    return [];
  }
  return data.map((item) => ({ ...item, is_read: Boolean(item.is_read || item.read_at) }));
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const { error } = await markSharedRead(userId, notificationId);
  if (error) console.error("Error marking notification read:", error);
  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await markSharedAllRead(userId);
  if (error) console.error("Error marking all notifications read:", error);
  return !error;
}

export function subscribeMerchantNotifications(userId: string, callback: () => void) {
  return subscribeToNotifications(userId, callback);
}

export async function deleteMerchantNotification(userId: string, notificationId: string): Promise<boolean> {
  const { error } = await deleteNotification(userId, notificationId);
  if (error) console.error("Error deleting notification:", error);
  return !error;
}
