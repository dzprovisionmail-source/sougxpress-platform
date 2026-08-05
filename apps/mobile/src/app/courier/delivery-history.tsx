import React, { useState } from "react";
import { ScrollView, RefreshControl } from "react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourier from "@/hooks/useCourier";
import useCourierOrders from "@/hooks/useCourierOrders";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceText,
  WorkspaceButton,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";
import { TOKENS } from "@/constants/tokens";
import { DeliveryStatus } from "@/services/courier-delivery.service";

type HistoryTabKey = "completed" | "cancelled";

const HISTORY_TAB_LABELS: Record<HistoryTabKey, string> = {
  completed: "مكتملة",
  cancelled: "ملغية",
};

export default function CourierDeliveryHistoryScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { courier } = useCourier(userId || "");
  const [historyTab, setHistoryTab] = useState<HistoryTabKey>("completed");

  const {
    completedDeliveries,
    cancelledDeliveries,
    loading,
    refreshDeliveries,
  } = useCourierOrders(courier?.id || "");

  const currentDeliveries =
    historyTab === "completed" ? completedDeliveries : cancelledDeliveries;

  if (loading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل سجل التوصيلات..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshDeliveries} tintColor={colors.primary} />
        }
      >
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm }}>
            {(Object.keys(HISTORY_TAB_LABELS) as HistoryTabKey[]).map((tab) => (
              <WorkspaceButton
                key={tab}
                title={HISTORY_TAB_LABELS[tab]}
                variant={historyTab === tab ? "primary" : "outline"}
                onPress={() => setHistoryTab(tab)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </SectionCard>

        {currentDeliveries.length === 0 ? (
          <EmptyState
            message={
              historyTab === "completed"
                ? "لا توجد توصيلات مكتملة"
                : "لا توجد توصيلات ملغية"
            }
          />
        ) : (
          currentDeliveries.map((delivery) => (
            <SectionCard key={delivery.id} style={{ marginBottom: tokens.spacing.md }}>
              <WorkspaceText variant="title">{delivery.store_name}</WorkspaceText>
              <WorkspaceText color="secondary" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                الزبون: {delivery.customer_name}
              </WorkspaceText>
              <WorkspaceText color="secondary" variant="caption">
                الحالة: {delivery.status}
              </WorkspaceText>
              <WorkspaceText color="secondary" variant="caption">
                المبلغ: {(delivery.total_minor / 100).toFixed(2)} دج
              </WorkspaceText>
              <WorkspaceText color="disabled" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                {new Date(delivery.created_at).toLocaleString("ar-DZ")}
              </WorkspaceText>
            </SectionCard>
          ))
        )}
      </ScrollView>
    </WorkspaceScreen>
  );
}