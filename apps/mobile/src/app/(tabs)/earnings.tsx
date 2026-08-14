import React, { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { FIXED_DELIVERY_FEE_MINOR, PLATFORM_SHARE_RATE, computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import { TOKENS } from "@/constants/tokens";

const PLATFORM_RIP = "00799999000524201107";
const APPROACHING_PAYMENT_DELIVERIES = 30;
const PAYMENT_REQUIRED_DELIVERIES = 50;
const COMMISSION_PER_DELIVERY_MINOR = Math.round(FIXED_DELIVERY_FEE_MINOR * PLATFORM_SHARE_RATE);

export default function CourierEarningsScreen() {
  const { colors } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver } = useDriver(userId || "");
  const { orders, loading } = useDriverOrders(userId || "", driver?.zone_id);

  const deliveredOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "delivered")
        .sort((a, b) => new Date(b.delivered_at || b.updated_at).getTime() - new Date(a.delivered_at || a.updated_at).getTime()),
    [orders]
  );

  // Commission is earned from the first completed delivery; 30 deliveries is
  // only an approaching-payment notice, never a visibility threshold.
  const completedDeliveryCount = Math.max(driver?.delivery_count ?? 0, deliveredOrders.length);
  const totals = computeEarningsSplit(completedDeliveryCount);
  const availableBalance = totals.driverShareMinor;
  const monthEarnings = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const count = deliveredOrders.filter((o) => new Date(o.delivered_at || o.updated_at) >= monthStart).length;
    return computeEarningsSplit(count).driverShareMinor;
  }, [deliveredOrders]);

  const deliveryCount = completedDeliveryCount;
  const paidThroughCount = driver?.commission_paid_through_count ?? 0;
  const unpaidDeliveryCount = Math.max(deliveryCount - paidThroughCount, 0);
  const commissionOwedMinor = Math.max(
    driver?.commission_owed_minor ?? 0,
    unpaidDeliveryCount * COMMISSION_PER_DELIVERY_MINOR
  );
  const isPaymentRequired = Boolean(driver?.is_suspended_for_debt) || unpaidDeliveryCount >= PAYMENT_REQUIRED_DELIVERIES;
  const isPaymentApproaching = unpaidDeliveryCount >= APPROACHING_PAYMENT_DELIVERIES && !isPaymentRequired;

  const copyRip = async () => {
    await Clipboard.setStringAsync(PLATFORM_RIP);
    Alert.alert("تم النسخ", "تم نسخ رقم RIP الخاص بالمنصة إلى الحافظة.");
  };

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>الأرباح وعمولة المنصة</Text>
        <Text style={[styles.loading, { color: colors.textSecondary }]}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>الأرباح وعمولة المنصة</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>تُحتسب حصة المنصة من أول توصيلة مكتملة، ولا تنتظر بلوغ 30 توصيلة.</Text>

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
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{deliveryCount}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>عمولة المنصة — 20% من كل توصيل</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>هذه العمولة تُحسب تلقائياً من أجرة التوصيل الثابتة، ولا يمكن تعديلها من تطبيق الموصل.</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>أجرة التوصيل</Text>
          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{formatCurrency(FIXED_DELIVERY_FEE_MINOR)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>حصة المنصة (20%)</Text>
          <Text style={[styles.rowValue, { color: colors.warning }]}>{formatCurrency(COMMISSION_PER_DELIVERY_MINOR)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>حصة الموصل (80%)</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>{formatCurrency(FIXED_DELIVERY_FEE_MINOR - COMMISSION_PER_DELIVERY_MINOR)}</Text>
        </View>
        <View style={[styles.row, styles.lastRow]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>التوصيلات غير المسددة</Text>
          <Text style={[styles.rowValue, { color: isPaymentRequired ? colors.error : colors.textPrimary }]}>{unpaidDeliveryCount}</Text>
        </View>
        <View style={[styles.totalBox, { backgroundColor: isPaymentRequired ? colors.error + "18" : colors.primary + "14" }]}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>المبلغ المستحق للمنصة</Text>
          <Text style={[styles.amountSmall, { color: isPaymentRequired ? colors.error : colors.primary }]}>{formatCurrency(commissionOwedMinor)}</Text>
        </View>
      </View>

      {(isPaymentApproaching || isPaymentRequired) && (
        <View style={[styles.alertCard, { backgroundColor: isPaymentRequired ? colors.error + "18" : colors.warning + "18", borderColor: isPaymentRequired ? colors.error : colors.warning }]}>
          <Text style={[styles.alertTitle, { color: isPaymentRequired ? colors.error : colors.warning }]}>
            {isPaymentRequired ? "الدفع مطلوب — تم تعطيل استقبال التوصيلات" : "اقترب موعد الدفع للمنصة"}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {isPaymentRequired
              ? "وصلت إلى 50 توصيلة غير مسددة. ادفع العمولة ثم يراجع المؤسس العملية ويعيد تفعيل الحساب."
              : `وصلت إلى ${unpaidDeliveryCount} توصيلة. يرجى تجهيز دفع العمولة قبل الوصول إلى 50 توصيلة.`}
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>تفاصيل الدفع عبر بريدي موب</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>حوّل المبلغ المستحق إلى حساب المنصة عبر بريدي موب، ثم أرسل إثبات الدفع إلى الإدارة للمراجعة.</Text>
        <Text style={[styles.ripLabel, { color: colors.textSecondary }]}>RIP المنصة عبر بريدي موب</Text>
        <View style={[styles.ripBox, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
          <Text selectable style={[styles.ripText, { color: colors.textPrimary }]}>{PLATFORM_RIP}</Text>
          <TouchableOpacity onPress={copyRip} style={[styles.copyButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.copyText, { color: colors.textOnBrand }]}>نسخ الرقم</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.footnote, { color: colors.textDisabled }]}>بعد تأكيد الإدارة للدفع، تُحدّث التوصيلات المسددة ويُرفع الحظر تلقائياً.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ملخص الأرباح</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>إجمالي أرباح الموصل</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>{formatCurrency(totals.driverShareMinor)}</Text>
        </View>
        <View style={[styles.row, styles.lastRow]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>إجمالي عمولة المنصة</Text>
          <Text style={[styles.rowValue, { color: colors.warning }]}>{formatCurrency(totals.platformShareMinor)}</Text>
        </View>
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
  amountSmall: { fontSize: 18, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: TOKENS.spacing.sm, textAlign: "right", writingDirection: "rtl" },
  description: { fontSize: 14, lineHeight: 22, textAlign: "right", writingDirection: "rtl", marginBottom: TOKENS.spacing.sm },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: TOKENS.spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.18)" },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, textAlign: "right", writingDirection: "rtl" },
  rowValue: { fontSize: 15, fontWeight: "700" },
  totalBox: { marginTop: TOKENS.spacing.sm, padding: TOKENS.spacing.md, borderRadius: TOKENS.radius.md, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  alertCard: { padding: TOKENS.spacing.lg, borderRadius: TOKENS.radius.lg, borderWidth: 1, marginBottom: TOKENS.spacing.md },
  alertTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: TOKENS.spacing.xs, writingDirection: "rtl" },
  ripLabel: { fontSize: 13, textAlign: "right", marginBottom: TOKENS.spacing.xs },
  ripBox: { borderWidth: 1, borderRadius: TOKENS.radius.md, padding: TOKENS.spacing.sm, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  ripText: { fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  copyButton: { paddingHorizontal: TOKENS.spacing.md, paddingVertical: TOKENS.spacing.sm, borderRadius: TOKENS.radius.sm },
  copyText: { fontSize: 13, fontWeight: "700" },
  footnote: { fontSize: 12, textAlign: "right", marginTop: TOKENS.spacing.sm, writingDirection: "rtl" },
});
