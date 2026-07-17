import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card } from "@/components/ui";
import { Bell, ChevronRight, ChevronLeft, Circle } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, is_read, read_at, created_at, type, notification_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("id", id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: now } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const unread = !item.is_read;
    return (
      <TouchableOpacity onPress={() => markAsRead(item.id)} activeOpacity={0.7}>
        <Card style={[
          styles.notificationCard,
          unread && { backgroundColor: "rgba(255, 138, 0, 0.05)", borderColor: colors.primary },
        ]}>
          <View style={[styles.notificationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
              <Bell size={20} color={unread ? colors.primary : colors.textDisabled} />
            </View>
            <View style={[styles.notificationInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="h3" style={unread ? { fontWeight: "700" } : {}}>
                  {item.title || "تنبيه جديد"}
                </Typography>
                {unread && <Circle size={8} color={colors.primary} fill={colors.primary} />}
              </View>
              <Typography variant="body" color="secondary" numberOfLines={2}>{item.body}</Typography>
              <Typography variant="caption" color="disabled" style={{ marginTop: 4 }}>
                {new Date(item.created_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {new Date(item.created_at).toLocaleDateString("ar-DZ")}
              </Typography>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL
            ? <ChevronRight size={24} color={colors.textPrimary} />
            : <ChevronLeft  size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>التنبيهات</Typography>
        <View style={{ width: 24 }} />
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
              ليس لديك أي تنبيهات حالياً
            </Typography>
          </View>
        }
      />
    </SafeAreaView>
  );
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
