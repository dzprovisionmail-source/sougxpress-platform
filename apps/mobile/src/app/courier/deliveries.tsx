import React, { useState } from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Clock, CheckCircle2, XCircle, Truck } from "lucide-react-native";

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
import { DeliveryStatus } from "@/services/courier-delivery.service";

type TabKey = "pending" | "active" | "completed";

const TAB_LABELS: Record<TabKey, string> = {
  pending: "بانتظار القبول",
  active: "نشطة",
  completed: "مكتملة",
};

const STATUS_ICON: Record<DeliveryStatus, React.ReactNode> = {
  pending: <Clock size={18} />,
  accepted: <Truck size={18} />,
  picked_up: <Truck size={18} />,
  on_the_way: <Truck size={18} />,
  delivered: <CheckCircle2 size={18} />,
  cancelled: <XCircle size={18} />,
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبول",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "مُسلّم",
  cancelled: "ملغي",
};

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "secondary",
  accepted: "primary",
  picked_up: "warning",
  on_the_way: "primary",
  delivered: "success",
  cancelled: "error",
};

export default function CourierDeliveriesScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { courier } = useCourier(userId || "");
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const {
    pendingDeliveries,
    activeDeliveries,
    completedDeliveries,
    cancelledDeliveries,
    loading,
    acceptDelivery,
    rejectDelivery,
    pickUpDelivery,
    startDelivery,
    completeDelivery,
    refreshDeliveries,
  } = useCourierOrders(courier?.id || "");

  const currentDeliveries =
    activeTab === "pending"
      ? pendingDeliveries
      : activeTab === "active"
      ? activeDeliveries
      : completedDeliveries;

  const handleAccept = async (orderId: string) => {
    await acceptDelivery(orderId);
  };

  const handleReject = async (orderId: string) => {
    await rejectDelivery(orderId);
  };

  const handlePickUp = async (orderId: string) => {
    await pickUpDelivery(orderId);
  };

  const handleStartDelivery = async (orderId: string) => {
    await startDelivery(orderId);
  };

  const handleComplete = async (orderId: string) => {
    await completeDelivery(orderId);
  };

  if (loading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل التوصيلات..." />
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
            {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
              <WorkspaceButton
                key={tab}
                title={TAB_LABELS[tab]}
                variant={activeTab === tab ? "primary" : "outline"}
                onPress={() => setActiveTab(tab)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </SectionCard>

        {activeTab === "pending" && pendingDeliveries.length === 0 && (
          <EmptyState message="لا توجد توصيلات بانتظار القبول" />
        )}

        {activeTab === "active" && activeDeliveries.length === 0 && (
          <EmptyState message="لا توجد توصيلات نشطة" />
        )}

        {activeTab === "completed" && completedDeliveries.length === 0 && (
          <EmptyState message="لا توجد توصيلات مكتملة" />
        )}

        {currentDeliveries.map((delivery) => (
          <SectionCard key={delivery.id} style={{ marginBottom: tokens.spacing.md }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing.sm }}>
              <WorkspaceText variant="title">{delivery.store_name}</WorkspaceText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {STATUS_ICON[delivery.status]}
                <WorkspaceText color={STATUS_COLOR[delivery.status]} variant="caption">
                  {STATUS_LABEL[delivery.status]}
                </WorkspaceText>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <WorkspaceText color="secondary" variant="caption">
                الزبون: {delivery.customer_name}
              </WorkspaceText>
              <WorkspaceText color="secondary" variant="caption">
                {delivery.customer_phone}
              </WorkspaceText>
              <WorkspaceText color="secondary" variant="caption">
                العنوان: {delivery.address_text}
              </WorkspaceText>
              <WorkspaceText color="secondary" variant="caption">
                المبلغ: {(delivery.total_minor / 100).toFixed(2)} دج
              </WorkspaceText>
            </View>

            {delivery.status === "pending" && (
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
                <WorkspaceButton
                  title="قبول"
                  variant="primary"
                  onPress={() => handleAccept(delivery.order_id)}
                  style={{ flex: 1 }}
                />
                <WorkspaceButton
                  title="رفض"
                  variant="danger"
                  onPress={() => handleReject(delivery.order_id)}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {delivery.status === "accepted" && (
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
                <WorkspaceButton
                  title="استلام"
                  variant="primary"
                  onPress={() => handlePickUp(delivery.order_id)}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {delivery.status === "picked_up" && (
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
                <WorkspaceButton
                  title="بدء التوصيل"
                  variant="primary"
                  onPress={() => handleStartDelivery(delivery.order_id)}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {delivery.status === "on_the_way" && (
              <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
                <WorkspaceButton
                  title="إتمام التوصيل"
                  variant="primary"
                  onPress={() => handleComplete(delivery.order_id)}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </SectionCard>
        ))}
      </ScrollView>
    </WorkspaceScreen>
  );
}