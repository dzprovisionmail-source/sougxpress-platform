import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import {
  Users,
  Store,
  Truck,
  ShoppingBag,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Package,
  DollarSign,
  Shield,
  FileText,
  Settings,
  ScrollText,
  Plus,
  UserPlus,
  TrendingUp,
  Activity,
  Bell,
  BarChart2,
  MapPin,
  Megaphone,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminStatCard, AdminErrorState } from "@/components/admin";
import {
  getControlCenterStats,
  getFounderActivityFeed,
  subscribeToFounderStats,
  logFounderDashboardAccess,
  type ControlCenterStats,
  type ActivityFeedEntry,
} from "@/services/founder.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={{ gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: tokens.typography.sizes.sm,
          fontWeight: "700",
          textAlign: "right",
          paddingHorizontal: tokens.spacing.lg,
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// ─── Stats row helper ─────────────────────────────────────────────────────────

function StatsRow({ children }: { children: React.ReactNode }) {
  const { tokens } = useAppTheme();
  return (
    <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg }}>
      {children}
    </View>
  );
}

// ─── Nav tile (module navigation) ────────────────────────────────────────────

function NavTile({
  label,
  icon,
  onPress,
  colors,
  tokens,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.navTile,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.navTileIcon,
          { backgroundColor: colors.bgSurface },
        ]}
      >
        {icon}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.sm,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 6,
          fontFamily: tokens.typography.families.arabic,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({
  label,
  icon,
  onPress,
  accentColor,
  colors,
  tokens,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  accentColor: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.quickAction,
        {
          backgroundColor: colors.bgElevated,
          borderColor: accentColor + "33",
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.quickActionIcon,
          { backgroundColor: accentColor + "18" },
        ]}
      >
        {icon}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.sm,
          fontWeight: "600",
          textAlign: "right",
          flex: 1,
          fontFamily: tokens.typography.families.arabic,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────

function ActivityItem({ item, colors, tokens }: { item: ActivityFeedEntry; colors: ReturnType<typeof useAppTheme>["colors"]; tokens: ReturnType<typeof useAppTheme>["tokens"] }) {
  const time = new Date(item.created_at).toLocaleString("ar-DZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.activityItem,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.sm,
          padding: tokens.spacing.md,
          marginBottom: tokens.spacing.sm,
        },
      ]}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: tokens.typography.sizes.sm,
            fontWeight: "600",
            fontFamily: tokens.typography.families.arabic,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {item.action}
        </Text>
        <Text
          style={{
            color: colors.textDisabled,
            fontSize: tokens.typography.sizes.xs,
            fontFamily: tokens.typography.families.arabic,
          }}
        >
          {time}
        </Text>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: tokens.typography.sizes.xs,
          marginTop: 2,
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {item.entity_type}
        {item.entity_id ? ` • ${item.entity_id.slice(0, 8)}` : ""}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FounderControlCenterScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<ControlCenterStats | null>(null);
  const [activity, setActivity] = useState<ActivityFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [statsData, activityData] = await Promise.all([
        getControlCenterStats(),
        getFounderActivityFeed(20),
      ]);
      setStats(statsData);
      setActivity(activityData);
    } catch (err) {
      console.error("Founder Control Center load error:", err);
      setError("تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    logFounderDashboardAccess();
    const subscription = subscribeToFounderStats(() => load(true));
    return () => {
      subscription.unsubscribe();
    };
  }, [load]);

  const fmt = (minor: number | null) => {
    if (minor === null) return "—";
    return `${(minor / 100).toLocaleString("ar-DZ")} د.ج`;
  };

  const fmtCount = (value: number | null) => (value === null ? "—" : String(value));

  const primary = colors.primary;
  const blue = colors.secondary;
  const success = colors.success;
  const warning = colors.warning;
  const errorColor = colors.error;
  const info = colors.info;

  if (loading) {
    return (
      <AdminPageShell title="مركز التحكم" showProfile showNotification={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: tokens.spacing.xl }}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={{ color: colors.textSecondary, marginTop: tokens.spacing.md, fontFamily: tokens.typography.families.arabic }}>
            جاري تحميل الإحصائيات...
          </Text>
        </View>
      </AdminPageShell>
    );
  }

  if (error && !stats) {
    return (
      <AdminPageShell title="مركز التحكم" showProfile showNotification={false}>
        <AdminErrorState message={error} onRetry={() => load()} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="مركز التحكم" showProfile showNotification={false} scrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingVertical: tokens.spacing.xl,
          paddingBottom: tokens.spacing["3xl"],
          gap: tokens.spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section: نظرة عامة ────────────────────────────────────── */}
        <SectionBlock title="نظرة عامة">
          <StatsRow>
            <AdminStatCard label="الزبائن" value={fmtCount(stats?.totalCustomers)} accent={blue} onPress={() => router.push("/founder/users" as never)} />
            <AdminStatCard label="التجار" value={fmtCount(stats?.totalMerchants)} accent={primary} onPress={() => router.push("/founder/users" as never)} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="الموصلون" value={fmtCount(stats?.totalDrivers)} accent={success} onPress={() => router.push("/founder/drivers" as never)} />
            <AdminStatCard label="المتاجر" value={fmtCount(stats?.totalStores)} accent={info} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="إجمالي الطلبات" value={fmtCount(stats?.totalOrders)} accent={primary} onPress={() => router.push("/founder/orders" as never)} />
            <View style={{ flex: 1 }} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: الطلبات ──────────────────────────────────────── */}
        <SectionBlock title="الطلبات">
          <StatsRow>
            <AdminStatCard label="طلبات اليوم" value={fmtCount(stats?.ordersToday)} accent={primary} />
            <AdminStatCard label="هذا الأسبوع" value={fmtCount(stats?.ordersThisWeek)} accent={info} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="هذا الشهر" value={fmtCount(stats?.ordersThisMonth)} accent={blue} />
            <AdminStatCard label="قيد الانتظار" value={fmtCount(stats?.pendingOrders)} accent={warning} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="نشطة" value={fmtCount(stats?.activeOrders)} accent={warning} />
            <AdminStatCard label="مكتملة" value={fmtCount(stats?.completedOrders)} accent={success} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="ملغاة" value={fmtCount(stats?.cancelledOrders)} accent={errorColor} />
            <AdminStatCard label="توصيلات منجزة" value={fmtCount(stats?.totalCompletedDeliveries)} accent={blue} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: انتظار الموافقة ──────────────────────────────── */}
        <SectionBlock title="في انتظار الموافقة">
          <StatsRow>
            <AdminStatCard label="تجار معلقون" value={fmtCount(stats?.pendingMerchants)} accent={warning} onPress={() => router.push("/founder/approvals" as never)} />
            <AdminStatCard label="موصلون معلقون" value={fmtCount(stats?.pendingDrivers)} accent={warning} onPress={() => router.push("/founder/approvals" as never)} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: المتاجر ──────────────────────────────────────── */}
        <SectionBlock title="المتاجر">
          <StatsRow>
            <AdminStatCard label="متاجر نشطة" value={fmtCount(stats?.activeStores)} accent={success} />
            <AdminStatCard label="متاجر غير نشطة" value={fmtCount(stats?.inactiveStores)} accent={errorColor} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: المالية ──────────────────────────────────────── */}
        <SectionBlock title="المالية">
          <View
            style={[
              styles.financeCard,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
              إجمالي المبيعات (GMV)
            </Text>
            <Text style={{ color: primary, fontSize: 22, fontWeight: "700", textAlign: "right", marginTop: 4, fontFamily: tokens.typography.families.arabic }}>
              {fmt(stats?.totalGMVMinor ?? null)}
            </Text>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>عمولة المنصة</Text>
              <Text style={{ color: success, fontSize: 16, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.platformCommissionMinor ?? null)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>أجور التوصيل</Text>
              <Text style={{ color: info, fontSize: 16, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.deliveryFeesMinor ?? null)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>المستحق للموصلين</Text>
              <Text style={{ color: warning, fontSize: 16, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.driverCommissionsOwedMinor ?? null)}</Text>
            </View>
          </View>
        </SectionBlock>

        {/* ── Section: نشاط المنصة ─────────────────────────────────── */}
        <SectionBlock title="نشاط المنصة">
          <View style={{ paddingHorizontal: tokens.spacing.lg }}>
            {activity.length === 0 ? (
              <Text style={{ color: colors.textDisabled, textAlign: "center", paddingVertical: 20, fontFamily: tokens.typography.families.arabic }}>
                لا يوجد نشاط حديث
              </Text>
            ) : (
              activity.map((item) => <ActivityItem key={item.id} item={item} colors={colors} tokens={tokens} />)
            )}
          </View>
        </SectionBlock>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <SectionBlock title="الإجراءات السريعة">
          <View style={styles.quickActionsGrid}>
            <QuickAction label="مركز الموافقات" icon={<CheckCircle size={18} color={warning} />} accentColor={warning} onPress={() => router.push("/founder/approvals" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة زبون" icon={<UserPlus size={18} color={blue} />} accentColor={blue} onPress={() => router.push("/founder/add-customer" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة تاجر" icon={<ShoppingBag size={18} color={primary} />} accentColor={primary} onPress={() => router.push("/founder/add-merchant" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة موصل" icon={<Truck size={18} color={success} />} accentColor={success} onPress={() => router.push("/founder/add-driver" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة متجر" icon={<Store size={18} color={info} />} accentColor={info} onPress={() => router.push("/founder/add-store" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>

        {/* ── Module Navigation ─────────────────────────────────────── */}
        <SectionBlock title="الوحدات">
          <View style={styles.navGrid}>
            <NavTile label="المستخدمون" icon={<Users size={20} color={primary} />} onPress={() => router.push("/founder/users" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المتاجر" icon={<Store size={20} color={primary} />} onPress={() => router.push("/founder/stores" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الطلبات" icon={<ClipboardList size={20} color={primary} />} onPress={() => router.push("/founder/orders" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الموصلون" icon={<Truck size={20} color={primary} />} onPress={() => router.push("/founder/drivers" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المالية" icon={<DollarSign size={20} color={primary} />} onPress={() => router.push("/founder/finance" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المحتوى" icon={<FileText size={20} color={primary} />} onPress={() => router.push("/founder/content" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الإعدادات" icon={<Settings size={20} color={primary} />} onPress={() => router.push("/founder/settings" as never)} colors={colors} tokens={tokens} />
            <NavTile label="سجل العمليات" icon={<ScrollText size={20} color={primary} />} onPress={() => router.push("/founder/audit-log" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  navGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 10,
  },
  navTile: {
    width: "22%",
    alignItems: "center",
    borderWidth: 1,
  },
  navTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsGrid: {
    gap: 8,
    paddingHorizontal: 10,
  },
  quickAction: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  financeCard: {
    borderWidth: 1,
    marginHorizontal: 10,
  },
  activityItem: {
    borderWidth: 1,
  },
});
