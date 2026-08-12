import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import { TOKENS } from "@/constants/tokens";

export default function CourierEarningsScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver } = useDriver(userId || "");
  const { orders, loading } = useDriverOrders(userId || "", driver?.zone_id);

  const deliveredOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "delivered")
        .sort((a, b) => new Date(b.delivered_at || b.updated_at).getTime() - new Date(a.delivered_at || b.updated_at).getTime()),
    [orders]
  );

  const totals = computeEarningsSplit(deliveredOrders.length);
  const availableBalance = useMemo(() => {
    const settled = deliveredOrders.filter((o) => o.status === "delivered").length;
    return computeEarningsSplit(settled).driverShareMinor;
  }, [deliveredOrders]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return deliveredOrders.filter((o) => new Date(o.delivered_at || o.updated_at) >= monthStart);
  }, [deliveredOrders]);

  const monthEarnings = computeEarningsSplit(thisMonth.length).driverShareMinor;

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>الأرباح</Text>
        <Text style={[styles.loading, { color: colors.textSecondary }]}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>الأرباح</Text>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>الرصيد المتاح</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(availableBalance)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>أرباح هذا الشهر</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(monthEarnings)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>إجمالي التوصيلات</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{deliveredOrders.length}</Text>
      </View>
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
  loading: {
    textAlign: "center",
    marginTop: TOKENS.spacing.xl,
  },
  card: {
    padding: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.md,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    marginBottom: TOKENS.spacing.xs,
  },
  amount: {
    fontSize: 22,
    fontWeight: "700",
  },
  center: {
    alignItems: "center",
    marginTop: TOKENS.spacing.xl,
    paddingHorizontal: TOKENS.spacing.md,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
