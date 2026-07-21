import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Modal, ScrollView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { DollarSign, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Filter, ChevronLeft } from "lucide-react-native";
import {
  AdminPageShell, AdminStatCard, AdminListItem,
  AdminLoadingState, AdminEmptyState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getFounderFinanceSummary, getFounderPayouts, getFounderTransactions, type FounderPayout, type FounderTransaction } from "@/services/founder-finance.service";

type TabKey = "overview" | "payouts" | "transactions";
type PayoutFilter = "all" | "merchant" | "driver";
type PayoutStatusFilter = "all" | "pending" | "processing" | "paid" | "failed";

const fmtMinor = (minor: number | null) => {
  if (minor === null) return "—";
  return `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;
};

export default function FounderFinanceScreen() {
  const { colors, tokens } = useAppTheme();
  const [tab, setTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<{ totalGMVMinor: number | null; totalCommissionMinor: number | null; totalDeliveryFeesMinor: number | null; totalPayoutsMinor: number | null; pendingPayoutsMinor: number | null; totalOrders: number | null; error: string | null }>({ totalGMVMinor: null, totalCommissionMinor: null, totalDeliveryFeesMinor: null, totalPayoutsMinor: null, pendingPayoutsMinor: null, totalOrders: null, error: null });
  const [payouts, setPayouts] = useState<FounderPayout[]>([]);
  const [transactions, setTransactions] = useState<FounderTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>("all");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutStatusFilter>("all");
  const [showPayoutFilters, setShowPayoutFilters] = useState(false);

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [summaryData, payoutsData, transactionsData] = await Promise.all([
        getFounderFinanceSummary(),
        getFounderPayouts(payoutFilter === "all" ? undefined : payoutFilter, payoutStatusFilter === "all" ? undefined : payoutStatusFilter),
        getFounderTransactions(),
      ]);
      setSummary(summaryData);
      setPayouts(payoutsData);
      setTransactions(transactionsData);
      if (summaryData.error) setError(summaryData.error);
    } catch {
      setError("تعذّر تحميل البيانات المالية");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [payoutFilter, payoutStatusFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ar-DZ");

  if (loading) {
    return (
      <AdminPageShell title="المالية" showBack>
        <AdminLoadingState message="جاري تحميل البيانات المالية..." />
      </AdminPageShell>
    );
  }

  if (error && !summary.totalOrders) {
    return (
      <AdminPageShell title="المالية" showBack>
        <AdminErrorState message={error} onRetry={() => loadAll(true)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="المالية" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.bgElevated, borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => setTab("overview")} style={[styles.tab, tab === "overview" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: tab === "overview" ? colors.primary : colors.textSecondary }]}>نظرة عامة</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("payouts")} style={[styles.tab, tab === "payouts" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: tab === "payouts" ? colors.primary : colors.textSecondary }]}>التسويات</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("transactions")} style={[styles.tab, tab === "transactions" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: tab === "transactions" ? colors.primary : colors.textSecondary }]}>المعاملات</Text>
          </TouchableOpacity>
        </View>

        {tab === "overview" && (
          <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: tokens.spacing.md }}>
              <AdminStatCard label="إجمالي المبيعات (GMV)" value={fmtMinor(summary.totalGMVMinor)} accent={colors.primary} />
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm }}>
                <AdminStatCard label="عمولة المنصة" value={fmtMinor(summary.totalCommissionMinor)} accent={colors.success} style={{ flex: 1 }} />
                <AdminStatCard label="أجور التوصيل" value={fmtMinor(summary.totalDeliveryFeesMinor)} accent={colors.info} style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm }}>
                <AdminStatCard label="إجمالي المدفوعات" value={fmtMinor(summary.totalPayoutsMinor)} accent={colors.secondary} style={{ flex: 1 }} />
                <AdminStatCard label="معلقة الدفع" value={fmtMinor(summary.pendingPayoutsMinor)} accent={colors.warning} style={{ flex: 1 }} />
              </View>
              <AdminStatCard label="إجمالي الطلبات" value={summary.totalOrders ?? "—"} accent={colors.primary} />
            </View>
          </ScrollView>
        )}

        {tab === "payouts" && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row-reverse", gap: 8, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg, alignItems: "center" }}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setShowPayoutFilters(true)} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                <Filter size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={payouts}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={colors.primary} />}
              ListEmptyComponent={<AdminEmptyState message="لا توجد تسويات" />}
              renderItem={({ item }) => (
                <AdminListItem
                  title={`${item.recipient_type === "merchant" ? "تاجر" : "موصل"} · ${fmtMinor(item.amount_minor)}`}
                  subtitle={`${fmtDate(item.period_start)} - ${fmtDate(item.period_end)} · ${item.status === "paid" ? "مدفوع" : item.status === "pending" ? "معلق" : item.status}`}
                  badge={item.status === "paid" ? "مدفوع" : item.status === "pending" ? "معلق" : item.status}
                  badgeColor={item.status === "paid" ? colors.success : item.status === "pending" ? colors.warning : colors.textSecondary}
                  right={<Text style={{ color: colors.textDisabled, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString("ar-DZ")}</Text>}
                />
              )}
            />
          </View>
        )}

        {tab === "transactions" && (
          <View style={{ flex: 1 }}>
            <FlatList
              data={transactions}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={colors.primary} />}
              ListEmptyComponent={<AdminEmptyState message="لا توجد معاملات" />}
              renderItem={({ item }) => (
                <AdminListItem
                  title={`${item.type === "order_payment" ? "دفع طلب" : item.type === "commission" ? "عمولة" : item.type === "payout" ? "تسوية" : item.type === "refund" ? "استرداد" : item.type}`}
                  subtitle={item.order_id ? `طلب ${item.order_id.slice(0, 8)}` : ""}
                  badge={fmtMinor(item.amount_minor)}
                  badgeColor={item.amount_minor >= 0 ? colors.success : colors.error}
                  right={<Text style={{ color: colors.textDisabled, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString("ar-DZ")}</Text>}
                />
              )}
            />
          </View>
        )}

        {/* Payout filters modal */}
        <Modal visible={showPayoutFilters} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية التسويات</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "right", marginBottom: 8, fontSize: 13 }}>النوع</Text>
              {([{ value: "all", label: "الكل" }, { value: "merchant", label: "تجار" }, { value: "driver", label: "موصلون" }] as Array<{ value: PayoutFilter; label: string }>).map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => { setPayoutFilter(opt.value); setShowPayoutFilters(false); }} style={[styles.filterOpt, { borderColor: payoutFilter === opt.value ? colors.primary : colors.borderSubtle, backgroundColor: payoutFilter === opt.value ? colors.primary + "18" : "transparent" }]}>
                  <Text style={{ color: payoutFilter === opt.value ? colors.primary : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={{ color: colors.textSecondary, textAlign: "right", marginBottom: 8, fontSize: 13, marginTop: 16 }}>الحالة</Text>
              {([{ value: "all", label: "الكل" }, { value: "pending", label: "معلق" }, { value: "paid", label: "مدفوع" }, { value: "processing", label: "قيد المعالجة" }] as Array<{ value: PayoutStatusFilter; label: string }>).map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => { setPayoutStatusFilter(opt.value); setShowPayoutFilters(false); }} style={[styles.filterOpt, { borderColor: payoutStatusFilter === opt.value ? colors.primary : colors.borderSubtle, backgroundColor: payoutStatusFilter === opt.value ? colors.primary + "18" : "transparent" }]}>
                  <Text style={{ color: payoutStatusFilter === opt.value ? colors.primary : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowPayoutFilters(false)} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إغلاق</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 4 },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  iconBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
});
