import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type NotificationFilter = "all" | "unread";

export type AppNotification = {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  notification_type: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
  delivery_status: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
};

const NOTIFICATION_COLUMNS =
  "id, title, body, type, notification_type, data, is_read, read_at, created_at, delivery_status, related_entity_type, related_entity_id";

export async function getNotifications(
  userId: string,
  filter: NotificationFilter = "all",
  limit = 100,
): Promise<{ data: AppNotification[]; error: Error | null }> {
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "unread") {
    query = query.is("read_at", null).or("is_read.eq.false,is_read.is.null");
  }

  const { data, error } = await query;
  return {
    data: (data ?? []) as AppNotification[],
    error: error ? new Error(error.message) : null,
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<{ error: Error | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return { error: error ? new Error(error.message) : null };
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<{ error: Error | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("user_id", userId)
    .is("read_at", null)
    .or("is_read.eq.false,is_read.is.null");

  return { error: error ? new Error(error.message) : null };
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  return { error: error ? new Error(error.message) : null };
}

export function subscribeToNotifications(
  userId: string,
  onChange: () => void,
): RealtimeChannel {
  return supabase
    .channel(`notifications:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}
