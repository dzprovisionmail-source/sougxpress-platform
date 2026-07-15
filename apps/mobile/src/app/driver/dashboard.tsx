import React, { useMemo } from "react";
import { ScrollView, RefreshControl, Switch, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Bike, Wallet, PackageCheck, Bell } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { computeEarningsSplit, formatCurrency } from "@/constants/earnings";
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

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading: driverLoading, updateDriver } = useDriver(userId || "");
  const { orders, availableOrders, loading, refreshOrders } = useDriverOrders(userId || "", driver?.zone_id);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    const completedToday = todayOrders.filter((o) => o.status === "delivered");
    const completedTotal = orders.filter((o) => o.status === "delivered");
    const pending = orders.filter((o) => ["ready_for_pickup", "picked_up"].includes(o.status));
    const earningsToday = computeEarningsSplit(completedToday.length).driverShareMinor;

    return {
      todayCount: todayOrders.length,
      pendingCount: pending.length,
      completedTodayCount: completedToday.length,
      totalDeliveries: completedTotal.length,
      earningsToday,
    };
  }, [orders]);

  const isOnline = driver?.availability === "online";

  const handleToggleOnline = async (value: boolean) => {
    await updateDriver({ availability: value ? "online" : "offline" });
  };

  if (driverLoading && !driver) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل ملفك..." />
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
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle icon={<Bike color={colors.primary} size={tokens.spacing.lg} />}>
              {`مرحباً ${driver?.full_name || ""}`}
            </SectionTitle>
            <TouchableOpacity onPress={() => router.push("/driver/notifications")}>
              <Bell color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: tokens.spacing.sm }}>
            <WorkspaceText color={isOnline ? "success" : "error"}>
              {isOnline ? "🟢 متصل ومستعد لاستلام الطلبات" : "🔴 غير متصل"}
            </WorkspaceText>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<PackageCheck color={colors.primary} size={tokens.spacing.lg} />}>
            نشاطي اليوم
          </SectionTitle>
          <StatGrid>
            <StatCard label="طلبات اليوم" value={String(stats.todayCount)} />
            <StatCard label="قيد التوصيل" value={String(stats.pendingCount)} accent={colors.info} />
            <StatCard label="مكتملة اليوم" value={String(stats.completedTodayCount)} accent={colors.success} />
          </StatGrid>
          <StatGrid>
            <StatCard label="إجمالي التوصيلات" value={String(stats.totalDeliveries)} accent={colors.secondary} />
            <StatCard label="طلبات متاحة" value={String(availableOrders.length)} accent={colors.warning} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            الأرباح
          </SectionTitle>
          <StatGrid>
            <StatCard label="أرباح اليوم" value={formatCurrency(stats.earningsToday)} accent={colors.success} />
          </StatGrid>
          <WorkspaceButton
            title="عرض التوصيلات"
            onPress={() => router.push("/driver/deliveries")}
            style={{ marginTop: tokens.spacing.md }}
          />
          <WorkspaceButton
            title="تفاصيل الأرباح"
            variant="outline"
            onPress={() => router.push("/driver/earnings")}
            style={{ marginTop: tokens.spacing.sm }}
          />
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
