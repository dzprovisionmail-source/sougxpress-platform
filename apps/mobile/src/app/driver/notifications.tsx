import React, { useEffect, useState, useCallback } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, Circle } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
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
}

/**
 * Driver notifications: new delivery requests, delivery status changes, and
 * payment/settlement reminders. Reuses the same generic `notifications`
 * table/read pattern as customer/notifications.tsx (no dedicated service
 * exists for this table, so we query it directly, matching that convention).
 */
export default function DriverNotificationsScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching driver notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

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

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: tokens.spacing.lg, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState message="لا توجد تنبيهات حالياً (طلبات جديدة، تغييرات الحالة، تذكيرات الدفع)." />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markAsRead(item.id)} activeOpacity={0.7}>
            <SectionCard
              style={
                !item.read_at
                  ? { borderColor: colors.primary, backgroundColor: colors.bgElevated }
                  : undefined
              }
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                <Bell size={20} color={!item.read_at ? colors.primary : colors.textDisabled} />
                <View style={{ flex: 1, marginRight: tokens.spacing.sm }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                    <WorkspaceText variant="title">{item.title || "تنبيه جديد"}</WorkspaceText>
                    {!item.read_at && <Circle size={8} color={colors.primary} fill={colors.primary} />}
                  </View>
                  {item.body && (
                    <WorkspaceText color="secondary" style={{ marginTop: tokens.spacing.xs }}>
                      {item.body}
                    </WorkspaceText>
                  )}
                  <WorkspaceText color="disabled" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                    {new Date(item.created_at).toLocaleString("ar-DZ")}
                  </WorkspaceText>
                </View>
              </View>
            </SectionCard>
          </TouchableOpacity>
        )}
      />
    </WorkspaceScreen>
  );
}
