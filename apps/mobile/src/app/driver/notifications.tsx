import React, { useEffect, useState, useCallback } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, Circle, X } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { supabase } from "@/lib/supabase";
import {
  WorkspaceScreen,
  SectionCard,
  WorkspaceText,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

interface DriverNotification {
  id: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
  type?: string | null;
}

const NOTIFICATION_TYPES: Record<string, string> = {
  new_order: "طلب جديد",
  status_change: "تحديث الحالة",
  payment: "دفعة",
  settlement: "تسوية",
  system: "النظام",
};

export default function DriverNotificationsScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.is("read_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching driver notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`driver_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (error) {
      console.error("Error marking driver notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading && !refreshing) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل التنبيهات..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          padding: tokens.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronRight color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <WorkspaceText variant="title">التنبيهات</WorkspaceText>
        <View style={{ width: 24 }} />
      </View>

      {unreadCount > 0 && (
        <View style={{ paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.sm }}>
          <TouchableOpacity onPress={markAllAsRead}>
            <WorkspaceText color="brand" variant="caption" style={{ textAlign: "right" }}>
              تحديد الكل كمقروء ({unreadCount})
            </WorkspaceText>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={{
          flexDirection: "row-reverse",
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
          gap: tokens.spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={{
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: tokens.spacing.xs,
            borderRadius: tokens.radius.full,
            backgroundColor: filter === "all" ? colors.primary : colors.bgSurface,
            borderWidth: 1,
            borderColor: filter === "all" ? colors.primary : colors.borderSubtle,
          }}
        >
          <WorkspaceText
            color={filter === "all" ? "brand" : "secondary"}
            variant="caption"
            style={{ fontWeight: filter === "all" ? "700" : "400" }}
          >
            الكل
          </WorkspaceText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("unread")}
          style={{
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: tokens.spacing.xs,
            borderRadius: tokens.radius.full,
            backgroundColor: filter === "unread" ? colors.primary : colors.bgSurface,
            borderWidth: 1,
            borderColor: filter === "unread" ? colors.primary : colors.borderSubtle,
          }}
        >
          <WorkspaceText
            color={filter === "unread" ? "brand" : "secondary"}
            variant="caption"
            style={{ fontWeight: filter === "unread" ? "700" : "400" }}
          >
            غير مقروء ({unreadCount})
          </WorkspaceText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: tokens.spacing.lg, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            message={
              filter === "unread"
                ? "لا توجد تنبيهات غير مقروءة."
                : "لا توجد تنبيهات حالياً (طلبات جديدة، تغييرات الحالة، تذكيرات الدفع)."
            }
          />
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          const typeLabel = item.type ? NOTIFICATION_TYPES[item.type] || item.type : "تنبيه";
          return (
            <TouchableOpacity
              onPress={() => unread && markAsRead(item.id)}
              activeOpacity={0.7}
              style={{ marginBottom: tokens.spacing.sm }}
            >
              <SectionCard
                style={
                  unread
                    ? { borderColor: colors.primary + "44", backgroundColor: colors.bgElevated }
                    : undefined
                }
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: unread ? colors.primary + "18" : colors.bgSurface,
                      justifyContent: "center",
                      alignItems: "center",
                      marginLeft: tokens.spacing.sm,
                    }}
                  >
                    <Bell size={20} color={unread ? colors.primary : colors.textDisabled} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <WorkspaceText variant="title" style={{ fontSize: tokens.typography.sizes.sm }}>
                        {item.title || typeLabel}
                      </WorkspaceText>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                        {unread && <Circle size={8} color={colors.primary} fill={colors.primary} />}
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              "حذف التنبيه",
                              "هل أنت متأكد من حذف هذا التنبيه؟",
                              [
                                { text: "إلغاء", style: "cancel" },
                                {
                                  text: "حذف",
                                  style: "destructive",
                                  onPress: () => deleteNotification(item.id),
                                },
                              ]
                            );
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={16} color={colors.textDisabled} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {item.body && (
                      <WorkspaceText color="secondary" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                        {item.body}
                      </WorkspaceText>
                    )}
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: tokens.spacing.xs,
                      }}
                    >
                      <WorkspaceText color="disabled" variant="caption">
                        {new Date(item.created_at).toLocaleString("ar-DZ")}
                      </WorkspaceText>
                      <WorkspaceText color="disabled" variant="caption">
                        {typeLabel}
                      </WorkspaceText>
                    </View>
                  </View>
                </View>
              </SectionCard>
            </TouchableOpacity>
          );
        }}
      />
    </WorkspaceScreen>
  );
}
