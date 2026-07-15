import React, { useMemo } from "react";
import { ScrollView, RefreshControl, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Bike, Wallet, PackageCheck } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
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

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading: driverLoading, updateDriver } = useDriver(userId || "");
  const { orders, availableOrders, loading, refreshOrders } = useDriverOrders(userId || "", driver?.zone_id);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    const completed = orders.filter((o) => o.status === "delivered");
    const inProgress = orders.filter((o) => ["ready_for_pickup", "picked_up"].includes(o.status));
    const earningsToday = todayOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + (o.delivery_fee_minor || 0), 0);

    return {
      todayCount: todayOrders.length,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
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
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>
          <WorkspaceText color={isOnline ? "success" : "error"}>
            {isOnline ? "🟢 متصل ومستعد لاستلام الطلبات" : "🔴 غير متصل"}
          </WorkspaceText>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<PackageCheck color={colors.primary} size={tokens.spacing.lg} />}>
            نشاطي اليوم
          </SectionTitle>
          <StatGrid>
            <StatCard label="طلبات اليوم" value={String(stats.todayCount)} />
            <StatCard label="قيد التوصيل" value={String(stats.inProgressCount)} accent={colors.info} />
            <StatCard label="مكتملة" value={String(stats.completedCount)} accent={colors.success} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            الأرباح
          </SectionTitle>
          <StatGrid>
            <StatCard label="أرباح اليوم" value={formatCurrency(stats.earningsToday)} accent={colors.success} />
            <StatCard label="طلبات متاحة" value={String(availableOrders.length)} accent={colors.warning} />
          </StatGrid>
          <WorkspaceButton
            title="عرض التوصيلات"
            onPress={() => router.push("/driver/deliveries")}
            style={{ marginTop: tokens.spacing.md }}
          />
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
