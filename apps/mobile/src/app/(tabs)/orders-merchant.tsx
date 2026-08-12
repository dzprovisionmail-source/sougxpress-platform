import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useMerchantOrders from "@/hooks/useMerchantOrders";
import { TOKENS } from "@/constants/tokens";
import { ClipboardList, Package } from "lucide-react-native";

export default function MerchantOrdersScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { orders, loading } = useMerchantOrders(userId || "");

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return "قيد الانتظار";
      case "confirmed": return "مؤكد";
      case "preparing": return "جاري التحضير";
      case "ready_for_pickup": return "جاهز للاستلام";
      case "out_for_delivery": return "في الطريق";
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
      <Text style={[styles.title, { color: colors.textPrimary }]}>الطلبات</Text>

      {orders.length === 0 ? (
        <View style={styles.center}>
          <ClipboardList size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد طلبات حتى الآن</Text>
        </View>
      ) : (
        orders.map((order: any) => (
          <View
            key={order.id}
            style={[styles.orderCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.orderHeader}>
              <Text style={[styles.orderId, { color: colors.textPrimary }]}>
                طلب #{order.id.slice(0, 8)}
              </Text>
              <Text style={[styles.orderStatus, { color: colors.primary }]}>
                {statusLabel(order.status)}
              </Text>
            </View>
            <Text style={[styles.orderTotal, { color: colors.textSecondary }]}>
              المجموع: {order.order_total_minor ? `${order.order_total_minor / 100} د.ج` : "غير محدد"}
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
  orderCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.xs,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  orderTotal: {
    fontSize: 14,
  },
});
