import React, { useMemo, useState } from "react";
import { ScrollView, RefreshControl, View, TouchableOpacity, Alert } from "react-native";
import { Wallet, History, TrendingUp, CircleDollarSign } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { FIXED_DELIVERY_FEE_MINOR, computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  StatGrid,
  StatCard,
  WorkspaceText,
  WorkspaceRow,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

export default function DriverEarningsScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver } = useDriver(userId || "");
  const { orders, loading, refreshOrders } = useDriverOrders(userId || "", driver?.zone_id);

  const deliveredOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "delivered")
        .sort((a, b) => new Date(b.delivered_at || b.updated_at).getTime() - new Date(a.delivered_at || a.updated_at).getTime()),
    [orders]
  );

  const totals = computeEarningsSplit(deliveredOrders.length);
  const availableBalance = useMemo(() => {
    const settled = deliveredOrders.filter((o) => o.status === "delivered").length;
    return computeEarningsSplit(settled).driverShareMinor;
  }, [deliveredOrders]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return deliveredOrders.filter((o) => new Date(o.delivered_at || o.updated_at) >= monthStart);
  }, [deliveredOrders]);

  const monthEarnings = computeEarningsSplit(thisMonth.length).driverShareMinor;

  if (loading && orders.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل الأرباح..." />
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
          <SectionTitle icon={<CircleDollarSign color={colors.primary} size={tokens.spacing.lg} />}>
            ملخص المحفظة
          </SectionTitle>
          <StatGrid>
            <StatCard label="الرصيد المتاح" value={formatCurrency(availableBalance)} accent={colors.success} />
            <StatCard label="أرباح هذا الشهر" value={formatCurrency(monthEarnings)} accent={colors.info} />
          </StatGrid>
          <WorkspaceRow label="أجرة التوصيل الثابتة" value={formatCurrency(FIXED_DELIVERY_FEE_MINOR)} />
          <WorkspaceRow label="نصيبي من كل توصيلة (80%)" value={formatCurrency(FIXED_DELIVERY_FEE_MINOR * 0.8)} />
          <WorkspaceRow label="نصيب المنصة من كل توصيلة (20%)" value={formatCurrency(FIXED_DELIVERY_FEE_MINOR * 0.2)} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<TrendingUp color={colors.primary} size={tokens.spacing.lg} />}>
            إحصائيات التسويات
          </SectionTitle>
          <StatGrid>
            <StatCard label="إجمالي التوصيلات" value={String(deliveredOrders.length)} />
            <StatCard label="إجمالي الأرباح" value={formatCurrency(totals.driverShareMinor)} accent={colors.success} />
          </StatGrid>
          <WorkspaceRow label="إجمالي نصيب المنصة" value={formatCurrency(totals.platformShareMinor)} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<History color={colors.primary} size={tokens.spacing.lg} />}>
            سجل التوصيلات
          </SectionTitle>
          {deliveredOrders.length === 0 ? (
            <EmptyState message="لا يوجد سجل توصيلات بعد." />
          ) : (
            deliveredOrders.map((order, index) => {
              const split = computeEarningsSplit(1);
              const isLast = index === deliveredOrders.length - 1;
              return (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => Alert.alert("تفاصيل التوصيلة", `المتجر: ${order.store?.name || "—"}\nالحالة: ${order.status}\nالأجرة: ${formatCurrency(split.driverShareMinor)}`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      paddingVertical: tokens.spacing.sm,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.borderSubtle,
                      flexDirection: "row-reverse",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <WorkspaceText variant="body">{order.store?.name || "متجر"}</WorkspaceText>
                      <WorkspaceText color="secondary" variant="caption" style={{ marginTop: 2 }}>
                        {new Date(order.delivered_at || order.updated_at).toLocaleString("ar-DZ")}
                      </WorkspaceText>
                    </View>
                    <WorkspaceText color="success" variant="body">
                      {formatCurrency(split.driverShareMinor)}
                    </WorkspaceText>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
