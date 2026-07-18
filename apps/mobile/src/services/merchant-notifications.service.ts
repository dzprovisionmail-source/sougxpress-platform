import { supabase } from "../lib/supabase";

export interface MerchantNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const getMerchantNotifications = async (): Promise<MerchantNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("Error fetching merchant notifications:", error);
    return [];
  }
  return (data ?? []) as MerchantNotification[];
};

export const markNotificationRead = async (notificationId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification read:", error);
    return false;
  }
  return true;
};

export const markAllNotificationsRead = async (): Promise<boolean> => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications read:", error);
    return false;
  }
  return true;
};

export const subscribeMerchantNotifications = (callback: () => void) => {
  return supabase
    .channel("merchant_notifications_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      callback
    )
    .subscribe();
};
