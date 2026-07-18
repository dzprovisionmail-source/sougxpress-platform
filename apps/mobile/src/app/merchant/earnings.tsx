import React, { useEffect, useState } from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import {
  Wallet,
  TrendingUp,
  PackageCheck,
  XCircle,
  Percent,
  ReceiptText,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId } from "@/services/store.service";
import { useMerchantEarnings } from "@/hooks/useMerchantEarnings";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  StatGrid,
  StatCard,
  WorkspaceRow,
  WorkspaceText,
  LoadingState,
} from "@/features/workspace/ui";

const fmt = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;

export default function MerchantEarningsScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    if (!userId) return;
    getStoreByMerchantId(userId).then((s) => setStoreId(s?.id ?? ""));
  }, [userId]);

  const { earnings, deliveryStats, loading, refresh } = useMerchantEarnings(
    userId ?? "",
    storeId
  );

  if (loading && !earnings) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل بيانات الأرباح..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing["3xl"],
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Revenue breakdown */}
        <SectionCard>
          <SectionTitle
            icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}
          >
            ملخص الإيرادات
          </SectionTitle>
          <StatGrid>
            <StatCard
              label="إيرادات اليوم"
              value={fmt(earnings?.todayRevenue ?? 0)}
              accent={colors.success}
            />
            <StatCard
              label="إيرادات الأسبوع"
              value={fmt(earnings?.weekRevenue ?? 0)}
              accent={colors.info}
            />
          </StatGrid>
          <StatGrid>
            <StatCard
              label="إيرادات الشهر"
              value={fmt(earnings?.monthRevenue ?? 0)}
              accent={colors.primary}
            />
            <StatCard
              label="إجمالي الإيرادات"
              value={fmt(earnings?.totalRevenue ?? 0)}
              accent={colors.warning}
            />
          </StatGrid>
        </SectionCard>

        {/* Payout info */}
        <SectionCard>
          <SectionTitle
            icon={
              <TrendingUp color={colors.primary} size={tokens.spacing.lg} />
            }
          >
            حالة الدفع
          </SectionTitle>
          <WorkspaceRow label="إجمالي المدفوعات" value={fmt(earnings?.totalPayout ?? 0)} />
          <WorkspaceRow
            label="المبلغ المعلّق"
            value={fmt(earnings?.pendingPayout ?? 0)}
            isLast
          />
        </SectionCard>

        {/* Delivery stats */}
        {deliveryStats && (
          <SectionCard>
            <SectionTitle
              icon={
                <PackageCheck color={colors.primary} size={tokens.spacing.lg} />
              }
            >
              إحصاءات التوصيل
            </SectionTitle>
            <StatGrid>
              <StatCard
                label="إجمالي الطلبات"
                value={String(deliveryStats.totalOrders)}
              />
              <StatCard
                label="تم التوصيل"
                value={String(deliveryStats.totalDelivered)}
                accent={colors.success}
              />
            </StatGrid>
            <StatGrid>
              <StatCard
                label="ملغية"
                value={String(deliveryStats.totalCancelled)}
                accent={colors.error}
              />
              <StatCard
                label="نسبة الإتمام"
                value={`${deliveryStats.completionRate}%`}
                accent={colors.info}
              />
            </StatGrid>
            <View style={{ marginTop: tokens.spacing.sm }}>
              <WorkspaceRow
                label="طلبات اليوم"
                value={String(deliveryStats.todayOrders)}
              />
              <WorkspaceRow
                label="توصيل اليوم"
                value={String(deliveryStats.todayDelivered)}
                isLast
              />
            </View>
          </SectionCard>
        )}

        {/* Recent transactions */}
        {(earnings?.recentTransactions?.length ?? 0) > 0 && (
          <SectionCard>
            <SectionTitle
              icon={
                <ReceiptText color={colors.primary} size={tokens.spacing.lg} />
              }
            >
              آخر المعاملات
            </SectionTitle>
            {earnings!.recentTransactions.map((tx, idx) => {
              const isLast = idx === earnings!.recentTransactions.length - 1;
              const typeLabel: Record<string, string> = {
                payment: "دفع",
                order_payment: "دفع طلب",
                payout: "صرف",
                refund: "استرداد",
                commission: "عمولة",
                adjustment: "تسوية",
              };
              return (
                <WorkspaceRow
                  key={tx.id}
                  label={
                    `${typeLabel[tx.type] ?? tx.type} · ${new Date(tx.created_at).toLocaleDateString("ar-DZ")}`
                  }
                  value={fmt(tx.amount_minor)}
                  isLast={isLast}
                />
              );
            })}
          </SectionCard>
        )}

        {(earnings?.recentTransactions?.length ?? 0) === 0 && !loading && (
          <SectionCard>
            <WorkspaceText color="secondary" style={{ textAlign: "center" }}>
              لا توجد معاملات مالية مسجلة بعد.
            </WorkspaceText>
          </SectionCard>
        )}
      </ScrollView>
    </WorkspaceScreen>
  );
}
