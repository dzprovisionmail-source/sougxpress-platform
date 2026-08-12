import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getCustomerOrders } from "@/services/order.service";
import { ClipboardList, Package } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";

export default function OrdersScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const data = await getCustomerOrders(user.id);
      setOrders(data || []);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>طلباتي</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <ClipboardList size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد طلبات حتى الآن</Text>
        </View>
      ) : (
        orders.map((order) => (
          <View
            key={order.id}
            style={[styles.orderCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.orderHeader}>
              <Text style={[styles.orderId, { color: colors.textPrimary }]}>
                طلب #{order.id.slice(0, 8)}
              </Text>
              <Text style={[styles.orderStatus, { color: colors.primary }]}>
                {order.status === "pending" ? "قيد الانتظار" :
                 order.status === "confirmed" ? "مؤكد" :
                 order.status === "preparing" ? "جاري التحضير" :
                 order.status === "ready_for_pickup" ? "جاهز للاستلام" :
                 order.status === "out_for_delivery" ? "في الطريق" :
                 order.status === "delivered" ? "تم التوصيل" :
                 order.status === "cancelled" ? "ملغى" : order.status}
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
