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
} from "lucide-react-native";
import { AdminPageShell, AdminStatCard } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderDashboardStats,
  logFounderDashboardAccess,
  type FounderDashboardStats,
} from "@/services/founder.service";

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
    <View style={{ gap: tokens.spacing.sm }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: tokens.typography.sizes.sm,
          fontWeight: "600",
          textAlign: "right",
          paddingHorizontal: 2,
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
    <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm }}>
      {children}
    </View>
  );
}

// ─── Nav tile (module navigation) ────────────────────────────────────────────

function NavTile({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { colors, tokens } = useAppTheme();
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
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  accentColor: string;
}) {
  const { colors, tokens } = useAppTheme();
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
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FounderDashboardScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<FounderDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getFounderDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Founder dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Log access via secure RPC — best-effort, never blocks
    logFounderDashboardAccess();
  }, [load]);

  const v = (key: keyof FounderDashboardStats): number | null =>
    loading ? null : (stats?.[key] ?? null);

  const primary  = colors.primary;
  const blue     = colors.secondary;
  const success  = colors.success;
  const warning  = colors.warning;
  const error    = colors.error;
  const info     = colors.info;

  const formatMinor = (minor: number | null) => {
    if (minor === null) return "—";
    return `${(minor / 100).toLocaleString("ar-DZ")} د.ج`;
  };

  return (
    <AdminPageShell
      title="نظام تشغيل المؤسس"
      showProfile
      showNotification={false}
      scrollable={false}
    >
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
        {/* ── Section: المستخدمون ────────────────────────────────────── */}
        <SectionBlock title="المستخدمون">
          <StatsRow>
            <AdminStatCard label="الزبائن" value={v("totalCustomers")} accent={blue}
              onPress={() => router.push("/founder/users" as never)} />
            <AdminStatCard label="التجار" value={v("totalMerchants")} accent={primary}
              onPress={() => router.push("/founder/users" as never)} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="الموصلون" value={v("totalDrivers")} accent={success}
              onPress={() => router.push("/founder/drivers" as never)} />
            <AdminStatCard label="المشرفون" value={v("totalAdmins")} accent={info} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard
              label="حسابات موقوفة"
              value={v("suspendedAccounts")}
              accent={error}
            />
            <View style={{ flex: 1 }} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: المتاجر ──────────────────────────────────────── */}
        <SectionBlock title="المتاجر">
          <StatsRow>
            <AdminStatCard label="إجمالي المتاجر" value={v("totalStores")} accent={primary}
              onPress={() => router.push("/founder/stores" as never)} />
            <AdminStatCard label="متاجر نشطة" value={v("activeStores")} accent={success} />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: الطلبات ──────────────────────────────────────── */}
        <SectionBlock title="الطلبات">
          <StatsRow>
            <AdminStatCard label="نشطة" value={v("activeOrders")} accent={warning}
              onPress={() => router.push("/founder/orders" as never)} />
            <AdminStatCard label="مكتملة" value={v("completedOrders")} accent={success} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="ملغاة" value={v("cancelledOrders")} accent={error} />
            <AdminStatCard
              label="توصيلات منجزة"
              value={v("totalCompletedDeliveries")}
              accent={blue}
            />
          </StatsRow>
        </SectionBlock>

        {/* ── Section: انتظار الموافقة ──────────────────────────────── */}
        <SectionBlock title="في انتظار الموافقة">
          <StatsRow>
            <AdminStatCard
              label="تجار معلقون"
              value={v("pendingMerchants")}
              accent={warning}
              onPress={() => router.push("/founder/users" as never)}
            />
            <AdminStatCard
              label="موصلون معلقون"
              value={v("pendingDrivers")}
              accent={warning}
              onPress={() => router.push("/founder/drivers" as never)}
            />
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
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right" }}>
              مستحق من الموصلين
            </Text>
            {loading ? (
              <ActivityIndicator color={primary} style={{ marginTop: 6 }} />
            ) : (
              <Text
                style={{
                  color: primary,
                  fontSize: 22,
                  fontWeight: "700",
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {formatMinor(stats?.driverCommissionsOwedMinor ?? null)}
              </Text>
            )}
          </View>
        </SectionBlock>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <SectionBlock title="الإجراءات السريعة">
          <View style={styles.quickActionsGrid}>
            <QuickAction
              label="إضافة زبون"
              icon={<UserPlus size={18} color={blue} />}
              accentColor={blue}
              onPress={() => router.push("/founder/add-customer" as never)}
            />
            <QuickAction
              label="إضافة تاجر"
              icon={<ShoppingBag size={18} color={primary} />}
              accentColor={primary}
              onPress={() => router.push("/founder/add-merchant" as never)}
            />
            <QuickAction
              label="إضافة موصل"
              icon={<Truck size={18} color={success} />}
              accentColor={success}
              onPress={() => router.push("/founder/add-driver" as never)}
            />
            <QuickAction
              label="إضافة متجر"
              icon={<Store size={18} color={info} />}
              accentColor={info}
              onPress={() => router.push("/founder/add-store" as never)}
            />
          </View>
        </SectionBlock>

        {/* ── Module Navigation ─────────────────────────────────────── */}
        <SectionBlock title="الوحدات">
          <View style={styles.navGrid}>
            <NavTile
              label="المستخدمون"
              icon={<Users size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/users" as never)}
            />
            <NavTile
              label="المتاجر"
              icon={<Store size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/stores" as never)}
            />
            <NavTile
              label="الطلبات"
              icon={<ClipboardList size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/orders" as never)}
            />
            <NavTile
              label="الموصلون"
              icon={<Truck size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/drivers" as never)}
            />
            <NavTile
              label="المالية"
              icon={<DollarSign size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/finance" as never)}
            />
            <NavTile
              label="المحتوى"
              icon={<FileText size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/content" as never)}
            />
            <NavTile
              label="الإعدادات"
              icon={<Settings size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/settings" as never)}
            />
            <NavTile
              label="سجل العمليات"
              icon={<ScrollText size={20} color={colors.primary} />}
              onPress={() => router.push("/founder/audit-log" as never)}
            />
          </View>
        </SectionBlock>
      </ScrollView>
    </AdminPageShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  navGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
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
  },
});
