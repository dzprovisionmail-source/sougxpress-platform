import React from "react";
import { ScrollView, View, RefreshControl } from "react-native";

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

const STATUS_FLOW: DeliveryStatus[] = [
  "pending",
  "accepted",
  "picked_up",
  "on_the_way",
  "delivered",
];

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبول",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "مُسلّم",
  cancelled: "ملغي",
};

export default function CustomerTrackingScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { courier } = useCourier(userId || "");

  const { activeDeliveries, loading, refreshDeliveries } = useCourierOrders(
    courier?.id || ""
  );

  if (loading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل حالة التوصيل..." />
      </WorkspaceScreen>
    );
  }

  if (activeDeliveries.length === 0) {
    return (
      <WorkspaceScreen>
        <EmptyState message="لا توجد توصيلات نشطة حالياً" />
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
        {activeDeliveries.map((delivery) => {
          const currentStepIndex = STATUS_FLOW.indexOf(delivery.status);

          return (
            <SectionCard key={delivery.id} style={{ marginBottom: tokens.spacing.md }}>
              <SectionTitle>تتبع التوصيل</SectionTitle>

              <WorkspaceText variant="title" style={{ marginBottom: tokens.spacing.sm }}>
                {delivery.store_name}
              </WorkspaceText>

              <WorkspaceText color="secondary" variant="caption">
                الزبون: {delivery.customer_name}
              </WorkspaceText>

              <View style={{ marginTop: tokens.spacing.md, gap: tokens.spacing.sm }}>
                {STATUS_FLOW.map((status, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <View
                      key={status}
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: tokens.spacing.sm,
                        opacity: isCompleted ? 1 : 0.4,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: isCompleted ? colors.success : colors.borderSubtle,
                        }}
                      />
                      {isCurrent && (
                        <View
                          style={{
                            position: "absolute",
                            left: 5,
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                      <WorkspaceText
                        variant="caption"
                        color={isCurrent ? "primary" : "secondary"}
                        style={{ fontWeight: isCurrent ? "700" : "400" }}
                      >
                        {STATUS_LABEL[status]}
                      </WorkspaceText>
                    </View>
                  );
                })}
              </View>

              <WorkspaceButton
                title="تحديث"
                variant="ghost"
                onPress={refreshDeliveries}
                style={{ marginTop: tokens.spacing.sm }}
              />
            </SectionCard>
          );
        })}
      </ScrollView>
    </WorkspaceScreen>
  );
}