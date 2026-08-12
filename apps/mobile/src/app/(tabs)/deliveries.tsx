import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourierOrders from "@/hooks/useCourierOrders";
import { TOKENS } from "@/constants/tokens";
import { ClipboardList, Bike } from "lucide-react-native";

export default function DeliveriesScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { activeDeliveries, loading } = useCourierOrders(userId || "");

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return "قيد الانتظار";
      case "accepted": return "مقبول";
      case "picked_up": return "تم الاستلام";
      case "on_the_way": return "في الطريق";
      case "delivered": return "تم التوصيل";
      case "cancelled": return "ملغى";
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>التوصيلات</Text>

      {activeDeliveries.length === 0 ? (
        <View style={styles.center}>
          <Bike size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد توصيلات نشطة</Text>
        </View>
      ) : (
        activeDeliveries.map((delivery) => (
          <View
            key={delivery.id}
            style={[styles.deliveryCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.deliveryHeader}>
              <Text style={[styles.deliveryId, { color: colors.textPrimary }]}>
                #{delivery.id.slice(0, 8)}
              </Text>
              <Text style={[styles.deliveryStatus, { color: colors.primary }]}>
                {statusLabel(delivery.status)}
              </Text>
            </View>
            <Text style={[styles.deliveryStore, { color: colors.textSecondary }]}>
              {delivery.store_name}
            </Text>
            <Text style={[styles.deliveryAddress, { color: colors.textSecondary }]}>
              {delivery.address_text}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: TOKENS.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: TOKENS.spacing.lg,
    textAlign: "right",
  },
  center: {
    alignItems: "center",
    marginTop: TOKENS.spacing.xl,
  },
  emptyText: {
    marginTop: TOKENS.spacing.md,
    fontSize: 16,
  },
  deliveryCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.sm,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.xs,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: "600",
  },
  deliveryStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  deliveryStore: {
    fontSize: 14,
    marginBottom: TOKENS.spacing.xs,
  },
  deliveryAddress: {
    fontSize: 14,
  },
});
