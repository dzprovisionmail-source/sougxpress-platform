import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  Users,
  Store,
  Truck,
  ShoppingBag,
  ClipboardList,
  CheckCircle,
  DollarSign,
  FileText,
  Settings,
  ScrollText,
  Plus,
  UserPlus,
  TrendingUp,
  Activity,
  Megaphone,
  Eye,
  ChevronLeft,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminStatCard, AdminErrorState } from "@/components/admin";
import {
  getControlCenterStats,
  subscribeToFounderStats,
  logFounderDashboardAccess,
  type ControlCenterStats,
} from "@/services/founder.service";

// ─── Founder visual foundation ────────────────────────────────────────────────

function FounderHero() {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
        },
      ]}
    >
      <View style={[styles.heroAccent, { backgroundColor: colors.primary }]} />
      <View style={styles.heroRow}>
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "44",
            },
          ]}
        >
          <TrendingUp size={22} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text
            style={{
              color: colors.primary,
              fontSize: tokens.typography.sizes.xs,
              fontWeight: "700",
              textAlign: "right",
              letterSpacing: 0.4,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            SOUG-XPRESS · FOUNDER CONTROL CENTER
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.sizes.lg,
              fontWeight: "800",
              textAlign: "right",
              marginTop: 4,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            مركز قيادة المنصة
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.sizes.sm,
              lineHeight: 20,
              textAlign: "right",
              marginTop: 3,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            رؤية موحّدة للعمليات الحية في Soug-XPRESS
          </Text>
          <View style={styles.heroLiveRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text
              style={{
                color: colors.success,
                fontSize: tokens.typography.sizes.xs,
                fontWeight: "700",
                fontFamily: tokens.typography.families.arabic,
              }}
            >
              مزامنة مباشرة مع بيانات المنصة
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

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
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionHeadingLine, { backgroundColor: colors.primary }]} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: tokens.typography.sizes.sm,
            fontWeight: "800",
            textAlign: "right",
            fontFamily: tokens.typography.families.arabic,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ─── Stats row helper ─────────────────────────────────────────────────────────

function StatsRow({ children }: { children: React.ReactNode }) {
  const { tokens } = useAppTheme();
  return (
    <View style={[styles.statsRow, { gap: tokens.spacing.sm }]}>
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



// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FounderControlCenterScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<ControlCenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const statsData = await getControlCenterStats();
      setStats(statsData);
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
      <AdminPageShell showLogout title="مركز التحكم" showProfile showNotification={false}>
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
      <AdminPageShell showLogout title="مركز التحكم" showProfile showNotification={false}>
        <AdminErrorState message={error} onRetry={() => load()} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مركز التحكم" showProfile showNotification={false} scrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingVertical: tokens.spacing.lg,
          paddingBottom: tokens.spacing["3xl"],
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
        <FounderHero />

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



        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <SectionBlock title="الإجراءات السريعة">
          <View style={styles.quickActionsGrid}>
            <QuickAction label="مركز الموافقات" icon={<CheckCircle size={18} color={warning} />} accentColor={warning} onPress={() => router.push("/founder/approvals" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة زبون" icon={<UserPlus size={18} color={blue} />} accentColor={blue} onPress={() => router.push("/founder/add-customer" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة تاجر" icon={<ShoppingBag size={18} color={primary} />} accentColor={primary} onPress={() => router.push("/founder/add-merchant" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة موصل" icon={<Truck size={18} color={success} />} accentColor={success} onPress={() => router.push("/founder/add-driver" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إضافة متجر" icon={<Store size={18} color={info} />} accentColor={info} onPress={() => router.push("/founder/add-store" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إنشاء متجر تجريبي" icon={<Plus size={18} color={warning} />} accentColor={warning} onPress={() => router.push("/founder/add-store" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إنشاء موصل تجريبي" icon={<Truck size={18} color={success} />} accentColor={success} onPress={() => router.push("/founder/add-demo-driver" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إنشاء زبون تجريبي" icon={<UserPlus size={18} color={blue} />} accentColor={blue} onPress={() => router.push("/founder/add-demo-customer" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="معاينة السوق كزائر" icon={<Eye size={18} color={info} />} accentColor={info} onPress={() => router.push("/guest-marketplace?preview=1" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إدارة شرائح العرض (Hero Slider)" icon={<Megaphone size={18} color={primary} />} accentColor={primary} onPress={() => router.push("/founder/hero-slides" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إعدادات أقسام السوق" icon={<Settings size={18} color={success} />} accentColor={success} onPress={() => router.push("/founder/market-settings" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>

        {/* ── Module Navigation ─────────────────────────────────────── */}
        <SectionBlock title="الوحدات">
          <View style={styles.navGrid}>
            <NavTile label="المستخدمون" icon={<Users size={20} color={primary} />} onPress={() => router.push("/founder/users" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المتاجر" icon={<Store size={20} color={primary} />} onPress={() => router.push("/founder/stores" as never)} colors={colors} tokens={tokens} />
            <NavTile label="إدارة الطلبات" icon={<ClipboardList size={20} color={primary} />} onPress={() => router.push("/founder/orders" as never)} colors={colors} tokens={tokens} />
            <NavTile label="إدارة التوصيلات" icon={<Truck size={20} color={primary} />} onPress={() => router.push("/founder/deliveries" as never)} colors={colors} tokens={tokens} />
            <NavTile label="مراقبة الزبائن" icon={<Users size={20} color={primary} />} onPress={() => router.push("/founder/customers-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="مراقبة التجار" icon={<Store size={20} color={primary} />} onPress={() => router.push("/founder/merchants-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="مراقبة الموصلون" icon={<Truck size={20} color={primary} />} onPress={() => router.push("/founder/couriers-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المالية" icon={<DollarSign size={20} color={primary} />} onPress={() => router.push("/founder/finance" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المحتوى" icon={<FileText size={20} color={primary} />} onPress={() => router.push("/founder/content" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الإعدادات" icon={<Settings size={20} color={primary} />} onPress={() => router.push("/founder/settings" as never)} colors={colors} tokens={tokens} />
            <NavTile label="نشاط المنصة" icon={<Activity size={20} color={primary} />} onPress={() => router.push("/founder/activity" as never)} colors={colors} tokens={tokens} />
            <NavTile label="سجل العمليات" icon={<ScrollText size={20} color={primary} />} onPress={() => router.push("/founder/audit-log" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>

        {/* ── سجل النشاط (Activity Log Card) ────────────────────────── */}
        <SectionBlock title="سجل النشاط">
          <TouchableOpacity
            onPress={() => router.push("/founder/activity" as never)}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: tokens.radius.md,
              padding: tokens.spacing.md,
              marginHorizontal: 16,
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: primary + "18", alignItems: "center", justifyContent: "center" }}>
                <Activity size={20} color={primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "700", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                  سجل النشاط
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", fontFamily: tokens.typography.families.arabic, marginTop: 2 }} numberOfLines={1}>
                  عرض السجل الكامل لجميع أنشطة وأحداث المنصة الحية
                </Text>
              </View>
            </View>
            <ChevronLeft color={primary} size={20} />
          </TouchableOpacity>
        </SectionBlock>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 4,
  },
  heroRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    alignItems: "stretch",
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLiveRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionBlock: {
    gap: 10,
    marginBottom: 20,
  },
  sectionHeading: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  sectionHeadingLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
  },
  navGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
  },
  navTile: {
    width: "31.5%",
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
  },
  quickAction: {
    width: "48.5%",
    minHeight: 68,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 9,
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
    marginHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  activityItem: {
    borderWidth: 1,
  },
});
