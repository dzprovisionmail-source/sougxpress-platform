import React from "react";
import { ScrollView, View } from "react-native";
import { Wallet, TrendingUp } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourier from "@/hooks/useCourier";
import useCourierOrders from "@/hooks/useCourierOrders";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceText,
  StatCard,
  StatGrid,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";
import { TOKENS } from "@/constants/tokens";

type PeriodKey = "daily" | "weekly" | "total";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  daily: "اليوم",
  weekly: "الأسبوع",
  total: "الإجمالي",
};

export default function CourierEarningsScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { courier } = useCourier(userId || "");
  const [period, setPeriod] = useState<PeriodKey>("total");

  const { earnings, loading, refreshEarnings } = useCourierOrders(courier?.id || "");

  const currentEarnings =
    period === "daily"
      ? earnings?.daily ?? 0
      : period === "weekly"
      ? earnings?.weekly ?? 0
      : earnings?.total ?? 0;

  const currentCount =
    period === "daily"
      ? earnings?.dailyCount ?? 0
      : period === "weekly"
      ? earnings?.weeklyCount ?? 0
      : earnings?.totalCount ?? 0;

  if (loading) {
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
      >
        <SectionCard>
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            الأرباح
          </SectionTitle>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
              <View
                key={p}
                style={{
                  flex: 1,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1,
                  borderColor: period === p ? colors.primary : colors.borderSubtle,
                  backgroundColor: period === p ? colors.primary + "22" : colors.bgElevated,
                  alignItems: "center",
                }}
              >
                <WorkspaceText
                  variant="caption"
                  color={period === p ? "brand" : "secondary"}
                  onPress={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </WorkspaceText>
              </View>
            ))}
          </View>
          <StatGrid>
            <StatCard
              label={PERIOD_LABELS[period]}
              value={`${(currentEarnings / 100).toFixed(2)} دج`}
              accent={colors.success}
            />
            <StatCard label="عدد التوصيلات" value={String(currentCount)} accent={colors.primary} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<TrendingUp color={colors.primary} size={tokens.spacing.lg} />}>
            ملخص سريع
          </SectionTitle>
          <StatGrid>
            <StatCard label="أرباح اليوم" value={`${((earnings?.daily ?? 0) / 100).toFixed(2)} دج`} accent={colors.success} />
            <StatCard label="أرباح الأسبوع" value={`${((earnings?.weekly ?? 0) / 100).toFixed(2)} دج`} accent={colors.warning} />
            <StatCard label="إجمالي الأرباح" value={`${((earnings?.total ?? 0) / 100).toFixed(2)} دج`} accent={colors.primary} />
          </StatGrid>
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}