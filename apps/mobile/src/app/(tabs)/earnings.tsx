import React, { useMemo, useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import {
  DRIVER_SUBSCRIPTION_PRICE_MINOR,
  FIXED_DELIVERY_FEE_MINOR,
  formatCurrency,
  computeEarningsSplit,
} from "@/constants/earnings";
import { TOKENS } from "@/constants/tokens";
import { supabase } from "@/lib/supabase";

type Subscription = {
  status: string;
  monthly_price_minor: number;
  trial_end: string;
  subscription_start: string;
};

export default function CourierEarningsScreen() {
  const { colors } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver } = useDriver(userId || "");
  const { orders, loading } = useDriverOrders(userId || "", driver?.zone_id);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("account_subscriptions")
      .select("status, monthly_price_minor, trial_end, subscription_start")
      .eq("account_id", userId)
      .eq("role", "driver")
      .maybeSingle()
      .then(({ data }) => setSubscription((data as Subscription | null) ?? null));
  }, [userId]);

  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered"),
    [orders]
  );
  const deliveryCount = Math.max(driver?.delivery_count ?? 0, deliveredOrders.length);
  const totals = computeEarningsSplit(deliveryCount);
  const monthEarnings = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const count = deliveredOrders.filter(
      (o) => new Date(o.delivered_at || o.updated_at) >= monthStart
    ).length;
    return computeEarningsSplit(count).driverShareMinor;
  }, [deliveredOrders]);
  const trialActive = subscription?.trial_end ? new Date(subscription.trial_end) > new Date() : true;

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>أرباح التوصيل والاشتراك</Text>
        <Text style={[styles.loading, { color: colors.textSecondary }]}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>أرباح التوصيل والاشتراك</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>تعود رسوم التوصيل كاملةً إلى الموصل، ولا توجد عمولة على الطلبات.</Text>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>الرصيد المكتسب من التوصيلات</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(totals.driverShareMinor)}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>أرباح هذا الشهر</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(monthEarnings)}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>إجمالي التوصيلات</Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{deliveryCount}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>رسوم التوصيل</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>يدفع الزبون 150 دج لكل طلب، وتُحتسب كاملةً ضمن مستحقات الموصل.</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>رسوم الطلب الواحد</Text>
          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{formatCurrency(FIXED_DELIVERY_FEE_MINOR)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>مستحق الموصل</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>{formatCurrency(FIXED_DELIVERY_FEE_MINOR)}</Text>
        </View>
        <View style={[styles.row, styles.lastRow]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>حصة المنصة من رسوم التوصيل</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>0 د.ج</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>اشتراك الموصل</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>السعر الشهري بعد التجربة</Text>
          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{formatCurrency(subscription?.monthly_price_minor ?? DRIVER_SUBSCRIPTION_PRICE_MINOR)}</Text>
        </View>
        <View style={[styles.row, styles.lastRow]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>الحالة</Text>
          <Text style={[styles.rowValue, { color: trialActive ? colors.success : colors.primary }]}>{trialActive ? "الفترة التجريبية المجانية" : subscription?.status === "active" ? "نشط" : "بانتظار التفعيل"}</Text>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>الاشتراك الحالي مجاني (نسخة تجريبية)\n500 دج اشتراك شهري بعد انطلاق النسخة التجارية</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: TOKENS.spacing.lg },
  content: { paddingBottom: TOKENS.spacing["3xl"] },
  title: { fontSize: 24, fontWeight: "700", marginBottom: TOKENS.spacing.lg, textAlign: "right", writingDirection: "rtl" },
  loading: { textAlign: "center", marginTop: TOKENS.spacing.xl },
  card: { padding: TOKENS.spacing.lg, borderRadius: TOKENS.radius.lg, borderWidth: 1, marginBottom: TOKENS.spacing.md },
  label: { fontSize: 14, marginBottom: TOKENS.spacing.xs, textAlign: "right" },
  amount: { fontSize: 22, fontWeight: "700", textAlign: "right" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: TOKENS.spacing.sm, textAlign: "right", writingDirection: "rtl" },
  description: { fontSize: 14, lineHeight: 22, textAlign: "right", writingDirection: "rtl", marginBottom: TOKENS.spacing.sm },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: TOKENS.spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.18)" },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, textAlign: "right", writingDirection: "rtl" },
  rowValue: { fontSize: 15, fontWeight: "700" },
});
