import React from "react";
import { FlatList, TouchableOpacity, View, RefreshControl } from "react-native";
import { Bell, BellOff, CheckCheck } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useMerchantNotifications } from "@/hooks/useMerchantNotifications";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceText,
  WorkspaceButton,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

const TYPE_LABELS: Record<string, string> = {
  order_status: "تحديث طلب",
  promotion: "عرض",
  system_alert: "تنبيه النظام",
  new_order: "طلب جديد",
};

export default function MerchantNotificationsScreen() {
  const { colors, tokens } = useAppTheme();
  const { notifications, loading, unreadCount, refresh, markRead, markAllRead } =
    useMerchantNotifications();

  if (loading && notifications.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل الإشعارات..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      {/* Header */}
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
          <Bell color={colors.primary} size={22} />
          <WorkspaceText
            variant="title"
            style={{ marginRight: tokens.spacing.sm }}
          >
            الإشعارات
          </WorkspaceText>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: colors.error,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: "center",
                justifyContent: "center",
                marginRight: tokens.spacing.sm,
                paddingHorizontal: 4,
              }}
            >
              <WorkspaceText
                style={{
                  color: "#fff",
                  fontSize: tokens.typography.sizes.xs,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {unreadCount}
              </WorkspaceText>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            style={{ flexDirection: "row-reverse", alignItems: "center" }}
          >
            <CheckCheck color={colors.primary} size={18} />
            <WorkspaceText
              color="brand"
              style={{ marginRight: 4, fontSize: tokens.typography.sizes.sm }}
            >
              قراءة الكل
            </WorkspaceText>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState message="لا توجد إشعارات حالياً." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingVertical: tokens.spacing.md }}
          renderItem={({ item }) => {
            const isUnread = !item.is_read;
            return (
              <TouchableOpacity
                onPress={() => markRead(item.id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "flex-start",
                  paddingHorizontal: tokens.spacing.lg,
                  paddingVertical: tokens.spacing.md,
                  backgroundColor: isUnread
                    ? colors.primary + "12"
                    : "transparent",
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                {/* Unread dot */}
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isUnread ? colors.primary : "transparent",
                    marginTop: 6,
                    marginLeft: tokens.spacing.md,
                  }}
                />

                <View style={{ flex: 1 }}>
                  {/* Type badge */}
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: colors.primary + "22",
                      borderRadius: tokens.radius.sm,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginBottom: tokens.spacing.xs,
                    }}
                  >
                    <WorkspaceText
                      style={{
                        color: colors.primary,
                        fontSize: tokens.typography.sizes.xs,
                        fontWeight: "700",
                      }}
                    >
                      {TYPE_LABELS[item.type] ?? item.type}
                    </WorkspaceText>
                  </View>

                  <WorkspaceText
                    variant="body"
                    style={{
                      fontWeight: isUnread ? "700" : "400",
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </WorkspaceText>
                  <WorkspaceText
                    color="secondary"
                    style={{ fontSize: tokens.typography.sizes.sm }}
                  >
                    {item.message}
                  </WorkspaceText>
                  <WorkspaceText
                    color="disabled"
                    style={{
                      fontSize: tokens.typography.sizes.xs,
                      marginTop: 4,
                    }}
                  >
                    {new Date(item.created_at).toLocaleString("ar-DZ")}
                  </WorkspaceText>
                </View>

                {isUnread ? (
                  <BellOff
                    color={colors.textDisabled}
                    size={16}
                    style={{ marginTop: 4 }}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </WorkspaceScreen>
  );
}
