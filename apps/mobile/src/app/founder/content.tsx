import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Share,
} from "react-native";
import { router } from "expo-router";
import { BarChart3, Users, ShoppingBag, Truck, TrendingUp, Download, Calendar } from "lucide-react-native";
import { AdminPageShell, AdminStatCard, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getFounderStatsForReports, getFounderMetrics, getFounderDeliveryPerformance, type FounderMetricsSnapshot } from "@/services/founder-reports.service";

type Period = "daily" | "weekly" | "monthly";

const fmtMinor = (minor: number | null) => {
  if (minor === null) return "—";
  return `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;
};

export default function FounderContentScreen() {
  const { colors, tokens } = useAppTheme();
  const [period, setPeriod] = useState<Period>("daily");
  const [stats, setStats] = useState<{ totalCustomers: number | null; totalMerchants: number | null; totalDrivers: number | null; totalStores: number | null; totalOrders: number | null; activeOrders: number | null; completedOrders: number | null; gmvMinor: number | null; commissionMinor: number | null; error: string | null }>({ totalCustomers: null, totalMerchants: null, totalDrivers: null, totalStores: null, totalOrders: null, activeOrders: null, completedOrders: null, gmvMinor: null, commissionMinor: null, error: null });
  const [metrics, setMetrics] = useState<FounderMetricsSnapshot[]>([]);
  const [delivery, setDelivery] = useState<{ total: number; delivered: number; cancelled: number; avgDeliveryTimeMin: number | null; completionRate: number; error: string | null }>({ total: 0, delivered: 0, cancelled: 0, avgDeliveryTimeMin: null, completionRate: 0, error: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [statsData, metricsData, deliveryData] = await Promise.all([
        getFounderStatsForReports(),
        getFounderMetrics(period),
        getFounderDeliveryPerformance(),
      ]);
      setStats(statsData);
      setMetrics(metricsData);
      setDelivery(deliveryData);
      if (statsData.error) throw new Error(statsData.error);
    } catch {
      setStats((s) => ({ ...s, error: "تعذّر تحميل التقارير" }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleExport = async () => {
    const reportText = [
      `تقرير Soug-XPRESS — ${period === "daily" ? "يومي" : period === "weekly" ? "أسبوعي" : "شهري"}`,
      `────────────────────────`,
      `الزبائن: ${stats.totalCustomers ?? "—"}`,
      `التجار: ${stats.totalMerchants ?? "—"}`,
      `الموصلون: ${stats.totalDrivers ?? "—"}`,
      `المتاجر: ${stats.totalStores ?? "—"}`,
      `الطلبات: ${stats.totalOrders ?? "—"}`,
      `نشطة: ${stats.activeOrders ?? "—"}`,
      `مكتملة: ${stats.completedOrders ?? "—"}`,
      `GMV: ${fmtMinor(stats.gmvMinor)}`,
      `العمولة: ${fmtMinor(stats.commissionMinor)}`,
      `────────────────────────`,
      `أداء التوصيل (30 يوم):`,
      `إجمالي: ${delivery.total}`,
      `تم التسليم: ${delivery.delivered}`,
      `ملغى: ${delivery.cancelled}`,
      `معدل الإنجاز: ${delivery.completionRate}%`,
      `متوسط الوقت: ${delivery.avgDeliveryTimeMin ? `${delivery.avgDeliveryTimeMin} دقيقة` : "—"}`,
    ].join("\n");

    try {
      await Share.share({ message: reportText, title: "تقرير Soug-XPRESS" });
    } catch {
      Alert.alert("تم تصدير التقرير", reportText);
    }
  };

  if (loading) {
    return (
      <AdminPageShell title="التقارير" showBack>
        <AdminLoadingState message="جاري تحميل التقارير..." />
      </AdminPageShell>
    );
  }

  if (stats.error && !stats.totalOrders) {
    return (
      <AdminPageShell title="التقارير" showBack>
        <AdminErrorState message={stats.error} onRetry={() => loadAll(true)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="التقارير والتحليلات" showBack scrollable={false}>
      <ScrollView
        contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: tokens.spacing.lg }}>
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodBtn, { backgroundColor: period === p ? colors.primary : colors.bgElevated, borderColor: period === p ? colors.primary : colors.borderSubtle }]}
            >
              <Text style={{ color: period === p ? "#fff" : colors.textPrimary, fontSize: 13, fontWeight: "700", textAlign: "center" }}>
                {p === "daily" ? "يومي" : p === "weekly" ? "أسبوعي" : "شهري"}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={handleExport} style={[styles.periodBtn, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
            <Download size={16} color={colors.success} />
          </TouchableOpacity>
        </View>

        {/* Active users */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 8, textTransform: "uppercase" }}>المستخدمون النشطون</Text>
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
          <AdminStatCard label="زبائن" value={stats.totalCustomers ?? "—"} accent={colors.secondary} style={{ flex: 1 }} />
          <AdminStatCard label="تجار" value={stats.totalMerchants ?? "—"} accent={colors.primary} style={{ flex: 1 }} />
          <AdminStatCard label="موصلون" value={stats.totalDrivers ?? "—"} accent={colors.success} style={{ flex: 1 }} />
          <AdminStatCard label="متاجر" value={stats.totalStores ?? "—"} accent={colors.info} style={{ flex: 1 }} />
        </View>

        {/* Orders */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 8, textTransform: "uppercase" }}>الطلبات</Text>
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
          <AdminStatCard label="إجمالي" value={stats.totalOrders ?? "—"} accent={colors.primary} style={{ flex: 1 }} />
          <AdminStatCard label="نشطة" value={stats.activeOrders ?? "—"} accent={colors.warning} style={{ flex: 1 }} />
          <AdminStatCard label="مكتملة" value={stats.completedOrders ?? "—"} accent={colors.success} style={{ flex: 1 }} />
        </View>

        {/* Revenue */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 8, textTransform: "uppercase" }}>الإيرادات</Text>
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
          <AdminStatCard label="GMV" value={fmtMinor(stats.gmvMinor)} accent={colors.primary} style={{ flex: 1 }} />
          <AdminStatCard label="العمولة" value={fmtMinor(stats.commissionMinor)} accent={colors.success} style={{ flex: 1 }} />
        </View>

        {/* Delivery performance */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 8, textTransform: "uppercase" }}>أداء التوصيل (30 يوم)</Text>
        <View style={[styles.perfCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.lg, marginBottom: tokens.spacing.lg }]}>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: 12 }}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>معدل الإنجاز</Text>
              <Text style={{ color: colors.success, fontSize: 24, fontWeight: "800" }}>{delivery.completionRate}%</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>متوسط الوقت</Text>
              <Text style={{ color: colors.info, fontSize: 24, fontWeight: "800" }}>{delivery.avgDeliveryTimeMin ? `${delivery.avgDeliveryTimeMin} د` : "—"}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm }}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>تم التسليم</Text>
              <Text style={{ color: colors.success, fontSize: 20, fontWeight: "700" }}>{delivery.delivered}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>ملغى</Text>
              <Text style={{ color: colors.error, fontSize: 20, fontWeight: "700" }}>{delivery.cancelled}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>إجمالي</Text>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: "700" }}>{delivery.total}</Text>
            </View>
          </View>
        </View>

        {/* Metrics timeline */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 8, textTransform: "uppercase" }}>الاتجاهات</Text>
        {metrics.length === 0 ? (
          <Text style={{ color: colors.textDisabled, textAlign: "center", paddingVertical: 20 }}>لا توجد بيانات اتجاهات متاحة</Text>
        ) : (
          metrics.slice(0, 10).map((m) => (
            <View key={m.id} style={[styles.metricRow, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right" }}>{new Date(m.period_start).toLocaleDateString("ar-DZ")}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right" }}>{m.total_orders} طلب · {fmtMinor(m.total_gmv_minor)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>{fmtMinor(m.total_commission_minor)}</Text>
                <Text style={{ color: colors.textDisabled, fontSize: 10 }}>عمولة</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  periodBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  perfCard: { borderWidth: 1 },
  metricRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
});
