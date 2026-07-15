import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import {
  Users,
  Store,
  Truck,
  ShoppingBag,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Bell,
  Plus,
  Settings,
  BarChart2,
  FileText,
  MapPin,
  Megaphone,
} from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminStatCard } from "@/components/admin";
import {
  AdminDashboardStats,
  getAdminDashboardStats,
} from "@/services/admin.service";

const QUICK_ACTIONS: Array<{
  label: string;
  icon: React.ReactNode;
  route: Parameters<typeof router.push>[0];
  color: string;
}> = [] as never;

export default function AdminDashboardScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const primary = colors.primary;
  const blue = colors.secondary;
  const success = colors.success;
  const warning = colors.warning;
  const error = colors.error;
  const info = colors.info;

  return (
    <AdminPageShell
      title="لوحة التحكم"
      showProfile
      showNotification
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
        {/* Section: المستخدمون */}
        <SectionBlock title="المستخدمون">
          <View style={styles.statsRow}>
            <AdminStatCard
              label="عدد الزبائن"
              value={loading ? null : (stats?.customersCount ?? null)}
              accent={blue}
              onPress={() =>
                router.push(
                  "/admin/customers" as Parameters<typeof router.push>[0]
                )
              }
            />
            <AdminStatCard
              label="عدد التجار"
              value={loading ? null : (stats?.merchantsCount ?? null)}
              accent={primary}
              onPress={() =>
                router.push(
                  "/admin/merchants" as Parameters<typeof router.push>[0]
                )
              }
            />
          </View>
          <View style={styles.statsRow}>
            <AdminStatCard
              label="عدد الموصلين"
              value={loading ? null : (stats?.driversCount ?? null)}
              accent={success}
              onPress={() =>
                router.push(
                  "/admin/drivers" as Parameters<typeof router.push>[0]
                )
              }
            />
            <AdminStatCard
              label="عدد المتاجر"
              value={loading ? null : (stats?.storesCount ?? null)}
              accent={info}
              onPress={() =>
                router.push(
                  "/admin/stores" as Parameters<typeof router.push>[0]
                )
              }
            />
          </View>
        </SectionBlock>

        {/* Section: الطلبات */}
        <SectionBlock title="الطلبات">
          <View style={styles.statsRow}>
            <AdminStatCard
              label="طلبات اليوم"
              value={loading ? null : (stats?.ordersToday ?? null)}
              accent={primary}
              onPress={() =>
                router.push(
                  "/admin/orders" as Parameters<typeof router.push>[0]
                )
              }
            />
            <AdminStatCard
              label="قيد الانتظار"
              value={loading ? null : (stats?.ordersPending ?? null)}
              accent={warning}
            />
          </View>
          <View style={styles.statsRow}>
            <AdminStatCard
              label="قيد التوصيل"
              value={loading ? null : (stats?.ordersInDelivery ?? null)}
              accent={info}
            />
            <AdminStatCard
              label="مكتملة"
              value={loading ? null : (stats?.ordersCompleted ?? null)}
              accent={success}
            />
          </View>
        </SectionBlock>

        {/* Section: تنبيهات */}
        <SectionBlock title="تنبيهات مهمة">
          <View style={styles.statsRow}>
            <AdminStatCard
              label="حسابات تنتظر الموافقة"
              value={loading ? null : (stats?.pendingApprovals ?? null)}
              accent={error}
              onPress={() =>
                router.push(
                  "/admin/merchants" as Parameters<typeof router.push>[0]
                )
              }
            />
          </View>
        </SectionBlock>

        {/* Quick Actions */}
        <SectionBlock title="الإجراءات السريعة">
          <View style={styles.actionsGrid}>
            <QuickAction
              label="إضافة متجر"
              icon={<Store color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/setup" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إضافة تاجر"
              icon={<ShoppingBag color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/setup" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إضافة موصل"
              icon={<Truck color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/setup" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إضافة زبون"
              icon={<Users color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/setup" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إدارة الطلبات"
              icon={<ClipboardList color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/orders" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إدارة المحتوى"
              icon={<FileText color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/content" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إرسال إشعار"
              icon={<Megaphone color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/notifications" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <QuickAction
              label="إعدادات المنصة"
              icon={<Settings color={colors.textPrimary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/settings" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
          </View>
        </SectionBlock>

        {/* Module Navigation */}
        <SectionBlock title="الوحدات">
          <View style={styles.actionsGrid}>
            <NavTile
              label="المناطق"
              icon={<MapPin color={primary} size={20} />}
              onPress={() =>
                router.push("/admin/zones" as Parameters<typeof router.push>[0])
              }
              colors={colors}
              tokens={tokens}
            />
            <NavTile
              label="المالية"
              icon={<BarChart2 color={primary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/finance" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <NavTile
              label="الشكاوى"
              icon={<AlertCircle color={primary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/disputes" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <NavTile
              label="التقارير"
              icon={<BarChart2 color={primary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/reports" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <NavTile
              label="سجل العمليات"
              icon={<Clock color={primary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/audit-logs" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
            <NavTile
              label="المنتجات"
              icon={<ShoppingBag color={primary} size={20} />}
              onPress={() =>
                router.push(
                  "/admin/products" as Parameters<typeof router.push>[0]
                )
              }
              colors={colors}
              tokens={tokens}
            />
          </View>
        </SectionBlock>
      </ScrollView>
    </AdminPageShell>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <View>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.textPrimary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
          },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function QuickAction({
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
      activeOpacity={0.8}
      style={[
        styles.actionTile,
        {
          backgroundColor: colors.primary,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          {
            color: "#000",
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.xs,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

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
      activeOpacity={0.8}
      style={[
        styles.actionTile,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          {
            color: colors.textPrimary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.xs,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 12,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  actionTile: {
    width: "23%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionLabel: {
    fontWeight: "600",
    textAlign: "center",
  },
});
