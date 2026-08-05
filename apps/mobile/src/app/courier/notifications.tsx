import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCircle2, Circle, Trash2 } from "lucide-react-native";

import { WorkspaceScreen, SectionCard, SectionTitle, WorkspaceText, WorkspaceButton, EmptyState } from "@/features/workspace/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { supabase } from "@/lib/supabase";

const isRTL = I18nManager.isRTL;

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function CourierNotificationsScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
      }
    } catch (e) {
      console.error("fetchNotifications failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchNotifications();
  };

  if (loading) {
    return (
      <WorkspaceScreen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={colors.primary} />}
      >
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle icon={<Bell color={colors.primary} size={tokens.spacing.lg} />}>
              الإشعارات
            </SectionTitle>
            {notifications.some((n) => !n.is_read) && (
              <WorkspaceButton title="تعليم الكل كمقروء" variant="ghost" onPress={markAllAsRead} />
            )}
          </View>
        </SectionCard>

        {notifications.length === 0 ? (
          <EmptyState message="لا توجد إشعارات" />
        ) : (
          notifications.map((notification) => (
            <SectionCard key={notification.id} style={{ marginBottom: tokens.spacing.md }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: tokens.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <WorkspaceText variant="title" style={{ fontSize: tokens.typography.sizes.sm }}>
                    {notification.title}
                  </WorkspaceText>
                  <WorkspaceText color="secondary" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                    {notification.message}
                  </WorkspaceText>
                  <WorkspaceText color="disabled" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                    {new Date(notification.created_at).toLocaleString("ar-DZ")}
                  </WorkspaceText>
                </View>
                <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, alignItems: "center" }}>
                  {!notification.is_read && (
                    <TouchableOpacity onPress={() => markAsRead(notification.id)}>
                      <Circle color={colors.primary} size={20} />
                    </TouchableOpacity>
                  )}
                  {notification.is_read && (
                    <CheckCircle2 color={colors.success} size={20} />
                  )}
                  <TouchableOpacity onPress={() => deleteNotification(notification.id)}>
                    <Trash2 color={colors.error} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </SectionCard>
          ))
        )}
      </ScrollView>
    </WorkspaceScreen>
  );
}
