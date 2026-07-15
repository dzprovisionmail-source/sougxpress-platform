import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { BarChart2, TrendingUp, Clock, CheckCircle, AlertCircle, Users, Store, Truck } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminStatCard, AdminLoadingState, AdminErrorState } from "@/components/admin";
import { getAdminDashboardStats, AdminDashboardStats } from "@/services/admin.service";

export default function AdminDashboardDetailScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (e) {
      setError("تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="لوحة المتابعة" showBack scrollable={false}>
      {loading && !refreshing ? (
        <AdminLoadingState message="جاري تحميل الإحصائيات..." />
      ) : error ? (
        <AdminErrorState message={error} onRetry={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingVertical: tokens.spacing.xl,
            paddingBottom: tokens.spacing["3xl"],
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Platform activity */}
          <SectionLabel title="نشاط المنصة" colors={colors} tokens={tokens} />
          <View style={styles.row}>
            <AdminStatCard
              label="طلبات اليوم"
              value={stats?.ordersToday ?? null}
              accent={colors.primary}
            />
            <AdminStatCard
              label="قيد الانتظار"
              value={stats?.ordersPending ?? null}
              accent={colors.warning}
            />
          </View>
          <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
            <AdminStatCard
              label="قيد التوصيل"
              value={stats?.ordersInDelivery ?? null}
              accent={colors.info}
            />
            <AdminStatCard
              label="مكتملة"
              value={stats?.ordersCompleted ?? null}
              accent={colors.success}
            />
          </View>

          {/* User accounts */}
          <SectionLabel title="الحسابات" colors={colors} tokens={tokens} style={{ marginTop: tokens.spacing.xl }} />
          <View style={styles.row}>
            <AdminStatCard label="زبائن" value={stats?.customersCount ?? null} accent={colors.secondary} />
            <AdminStatCard label="تجار" value={stats?.merchantsCount ?? null} accent={colors.primary} />
          </View>
          <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
            <AdminStatCard label="موصلون" value={stats?.driversCount ?? null} accent={colors.success} />
            <AdminStatCard label="متاجر" value={stats?.storesCount ?? null} accent={colors.info} />
          </View>

          {/* Alerts */}
          <SectionLabel title="تنبيهات" colors={colors} tokens={tokens} style={{ marginTop: tokens.spacing.xl }} />
          <View style={styles.row}>
            <AdminStatCard
              label="حسابات تنتظر الموافقة"
              value={stats?.pendingApprovals ?? null}
              accent={colors.error}
            />
          </View>

          {/* Placeholder sections */}
          <SectionLabel title="أداء اليوم" colors={colors} tokens={tokens} style={{ marginTop: tokens.spacing.xl }} />
          <PlaceholderCard label="إيرادات اليوم" colors={colors} tokens={tokens} />
          <PlaceholderCard label="متوسط وقت التوصيل" colors={colors} tokens={tokens} />
          <PlaceholderCard label="تقييم المنصة" colors={colors} tokens={tokens} />
        </ScrollView>
      )}
    </AdminPageShell>
  );
}

function SectionLabel({
  title,
  colors,
  tokens,
  style,
}: {
  title: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
  style?: object;
}) {
  return (
    <Text
      style={[
        styles.sectionLabel,
        {
          color: colors.textPrimary,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.base,
          paddingHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.md,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}

function PlaceholderCard({
  label,
  colors,
  tokens,
}: {
  label: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <View
      style={[
        styles.placeholderCard,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.md,
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
        },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.base,
          fontWeight: "600",
          textAlign: "right",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.textDisabled,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.sm,
        }}
      >
        غير متاح
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontWeight: "700",
    textAlign: "right",
  },
  placeholderCard: {
    borderWidth: 1,
  },
});
