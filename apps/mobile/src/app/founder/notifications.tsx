import { useCallback } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { Bell, BellOff, CheckCheck } from "lucide-react-native";
import { router } from "expo-router";
import { AdminPageShell } from "@/components/admin";
import { Typography } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";

export default function FounderNotificationsScreen() {
  const { colors, tokens } = useAppTheme();
  const { notifications, loading, unreadCount, refresh, markRead, markAllRead } = useNotifications();

  const openNotification = useCallback(async (id: string, data: Record<string, unknown> | null) => {
    await markRead(id);
    const deepLink = typeof data?.deep_link === "string" ? data.deep_link : null;
    if (deepLink) router.push(deepLink as never);
  }, [markRead]);

  return (
    <AdminPageShell showLogout showBack title="إشعارات المؤسس" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: tokens.spacing.md }}>
          <Typography variant="h3">كل أحداث المنصة</Typography>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => void markAllRead()} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
              <CheckCheck size={17} color={colors.primary} />
              <Typography color="brand">تحديد الكل كمقروء ({unreadCount})</Typography>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void refresh(true)}
          contentContainerStyle={{ paddingBottom: tokens.spacing["3xl"] }}
          ListEmptyComponent={(
            <View style={{ alignItems: "center", paddingVertical: tokens.spacing["3xl"] }}>
              <Bell color={colors.textDisabled} size={48} />
              <Typography color="secondary" style={{ marginTop: tokens.spacing.md }}>لا توجد إشعارات للمؤسس</Typography>
            </View>
          )}
          renderItem={({ item }) => {
            const unread = !item.is_read && !item.read_at;
            return (
              <TouchableOpacity
                onPress={() => void openNotification(item.id, item.data)}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "flex-start",
                  gap: tokens.spacing.sm,
                  padding: tokens.spacing.md,
                  marginBottom: tokens.spacing.sm,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1,
                  borderColor: unread ? colors.primary + "66" : colors.borderSubtle,
                  backgroundColor: unread ? colors.primary + "10" : colors.bgSurface,
                }}
              >
                {unread ? <Bell color={colors.primary} size={20} /> : <BellOff color={colors.textDisabled} size={20} />}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 }}>
                    <Typography style={{ fontWeight: unread ? "800" : "600", flex: 1 }}>{item.title}</Typography>
                    <Typography color="disabled" style={{ fontSize: 11 }}>{new Date(item.created_at).toLocaleString("ar-DZ")}</Typography>
                  </View>
                  <Typography color="secondary" style={{ marginTop: 4 }}>{item.body}</Typography>
                  <Typography color="brand" style={{ marginTop: 6, fontSize: 11 }}>{item.type ?? "حدث منصة"}</Typography>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </AdminPageShell>
  );
}
