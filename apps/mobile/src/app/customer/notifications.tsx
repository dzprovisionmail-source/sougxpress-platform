import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card } from "@/components/ui";
import { Bell, ChevronRight, ChevronLeft, Circle, X, CheckCheck } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

interface CustomerNotification {
  id: string;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
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

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("notifications")
        .select("id, title, body, is_read, read_at, created_at, type, notification_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.or("is_read.eq.false,is_read.is.null,read_at.is.null");
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel("customer_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: now } : n)));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .in("id", unreadIds);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: now })));
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL
            ? <ChevronRight size={24} color={colors.textPrimary} />
            : <ChevronLeft size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>التنبيهات</Typography>
        <View style={{ width: 24 }} />
      </View>

      {unreadCount > 0 && (
        <View style={{ paddingHorizontal: TOKENS.spacing.lg, paddingVertical: TOKENS.spacing.sm }}>
          <TouchableOpacity onPress={markAllAsRead}>
            <Typography variant="caption" color="primary" style={{ textAlign: "right", fontWeight: "600" }}>
              تحديد الكل كمقروء ({unreadCount})
            </Typography>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          paddingHorizontal: TOKENS.spacing.lg,
          paddingVertical: TOKENS.spacing.sm,
          gap: TOKENS.spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={{
            paddingHorizontal: TOKENS.spacing.md,
            paddingVertical: TOKENS.spacing.sm,
            borderRadius: TOKENS.radius.full,
            backgroundColor: filter === "all" ? colors.primary : colors.bgSurface,
            borderWidth: 1,
            borderColor: filter === "all" ? colors.primary : colors.borderSubtle,
          }}
        >
          <Typography
            variant="caption"
            style={{ color: filter === "all" ? "#FFF" : colors.textSecondary, fontWeight: filter === "all" ? "700" : "400" }}
          >
            الكل
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("unread")}
          style={{
            paddingHorizontal: TOKENS.spacing.md,
            paddingVertical: TOKENS.spacing.sm,
            borderRadius: TOKENS.radius.full,
            backgroundColor: filter === "unread" ? colors.primary : colors.bgSurface,
            borderWidth: 1,
            borderColor: filter === "unread" ? colors.primary : colors.borderSubtle,
          }}
        >
          <Typography
            variant="caption"
            style={{ color: filter === "unread" ? "#FFF" : colors.textSecondary, fontWeight: filter === "unread" ? "700" : "400" }}
          >
            غير مقروء ({unreadCount})
          </Typography>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              {filter === "unread" ? "لا توجد تنبيهات غير مقروءة" : "ليس لديك أي تنبيهات حالياً"}
            </Typography>
          </View>
        }
      />
    </SafeAreaView>
  );

  function renderNotificationItem({ item }: { item: CustomerNotification }) {
    const unread = !item.is_read;
    const typeLabel = item.type ? NOTIFICATION_TYPES[item.type] || item.type : "تنبيه";
    return (
      <TouchableOpacity
        onPress={() => unread && markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <Card
          style={
            unread
              ? { borderColor: colors.primary + "44", backgroundColor: colors.bgElevated }
              : undefined
          }
        >
          <View style={[styles.notificationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
              <Bell size={20} color={unread ? colors.primary : colors.textDisabled} />
            </View>
            <View style={[styles.notificationInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="h3" style={unread ? { fontWeight: "700" } : {}}>
                  {item.title || typeLabel}
                </Typography>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
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
                <Typography variant="body" color="secondary" numberOfLines={2}>
                  {item.body}
                </Typography>
              )}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: TOKENS.spacing.xs,
                }}
              >
                <Typography variant="caption" color="disabled">
                  {new Date(item.created_at).toLocaleString("ar-DZ")}
                </Typography>
                <Typography variant="caption" color="disabled">
                  {typeLabel}
                </Typography>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
    flex: 1,
    textAlign: "center",
  },
  backBtn: { padding: 4 },
  listContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
    flexGrow: 1,
  },
  notificationCard: { padding: TOKENS.spacing.md },
  notificationRow: { alignItems: "flex-start", gap: TOKENS.spacing.md },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationInfo: { flex: 1 },
  titleRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    justifyContent: "space-between",
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
