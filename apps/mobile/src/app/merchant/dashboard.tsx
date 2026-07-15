import React, { useMemo } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { PackageCheck, Clock3, Wallet, TrendingUp } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useMerchantOrders from "@/hooks/useMerchantOrders";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  StatGrid,
  StatCard,
  WorkspaceButton,
  WorkspaceText,
  LoadingState,
} from "@/features/workspace/ui";

const formatCurrency = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;

export default function MerchantDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { orders, loading, refreshOrders } = useMerchantOrders(userId || "");

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    const pending = orders.filter((o) => o.status === "pending");
    const active = orders.filter((o) => ["accepted", "preparing", "ready_for_pickup"].includes(o.status));
    const completed = orders.filter((o) => o.status === "delivered");
    const revenueToday = todayOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.subtotal_minor || 0), 0);

    return {
      todayCount: todayOrders.length,
      pendingCount: pending.length,
      activeCount: active.length,
      completedCount: completed.length,
      revenueToday,
    };
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل لوحة التحكم..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshOrders} tintColor={colors.primary} />}
      >
        <SectionCard>
          <SectionTitle>نظرة عامة على اليوم</SectionTitle>
          <StatGrid>
            <StatCard label="طلبات اليوم" value={String(stats.todayCount)} />
            <StatCard label="إيرادات اليوم" value={formatCurrency(stats.revenueToday)} accent={colors.success} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<PackageCheck color={colors.primary} size={tokens.spacing.lg} />}>
            حالة الطلبات
          </SectionTitle>
          <StatGrid>
            <StatCard label="جديدة" value={String(stats.pendingCount)} accent={colors.warning} />
            <StatCard label="قيد التنفيذ" value={String(stats.activeCount)} accent={colors.info} />
            <StatCard label="مكتملة" value={String(stats.completedCount)} accent={colors.success} />
          </StatGrid>
          <WorkspaceButton
            title="فتح مركز الطلبات"
            onPress={() => router.push("/merchant/orders")}
            style={{ marginTop: tokens.spacing.md }}
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Clock3 color={colors.primary} size={tokens.spacing.lg} />}>
            إجراءات سريعة
          </SectionTitle>
          <WorkspaceButton
            title="إدارة المتجر والمنتجات"
            variant="outline"
            onPress={() => router.push("/merchant/store")}
            style={{ marginBottom: tokens.spacing.sm }}
          />
          <WorkspaceButton
            title="إعدادات الحساب"
            variant="ghost"
            onPress={() => router.push("/merchant/profile")}
          />
        </SectionCard>

        {orders.length === 0 && (
          <SectionCard>
            <WorkspaceText color="secondary" style={{ textAlign: "center" }}>
              لا توجد طلبات بعد. سيظهر هنا كل نشاط متجرك أولاً بأول.
            </WorkspaceText>
          </SectionCard>
        )}
      </ScrollView>
    </WorkspaceScreen>
  );
}
