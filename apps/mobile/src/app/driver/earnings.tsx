import React, { useMemo } from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import { Wallet, History } from "lucide-react-native";

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
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            ملخص الأرباح
          </SectionTitle>
          <StatGrid>
            <StatCard label="إجمالي التوصيلات" value={String(deliveredOrders.length)} />
            <StatCard label="أرباحي" value={formatCurrency(totals.driverShareMinor)} accent={colors.success} />
          </StatGrid>
          <WorkspaceRow
            label="أجرة التوصيل الثابتة"
            value={formatCurrency(FIXED_DELIVERY_FEE_MINOR)}
          />
          <WorkspaceRow label="نصيبي من كل توصيلة (80%)" value={formatCurrency(FIXED_DELIVERY_FEE_MINOR * 0.8)} />
          <WorkspaceRow label="نصيب المنصة من كل توصيلة (20%)" value={formatCurrency(FIXED_DELIVERY_FEE_MINOR * 0.2)} />
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
                <View
                  key={order.id}
                  style={{
                    paddingVertical: tokens.spacing.sm,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.borderSubtle,
                  }}
                >
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                    <WorkspaceText variant="body">{order.store?.name || "متجر"}</WorkspaceText>
                    <WorkspaceText color="success" variant="body">
                      {formatCurrency(split.driverShareMinor)}
                    </WorkspaceText>
                  </View>
                  <WorkspaceText color="secondary" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                    {new Date(order.delivered_at || order.updated_at).toLocaleString("ar-DZ")}
                  </WorkspaceText>
                </View>
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
