import React, { useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { MapPin, ShoppingCart, RefreshCcw } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { Order, OrderStatus } from "@/types/schema-03-core";
import {
  WorkspaceScreen,
  WorkspaceText,
  WorkspaceButton,
  SectionCard,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

type TabKey = "available" | "active" | "completed";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ready_for_pickup: "picked_up",
  picked_up: "delivered",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  ready_for_pickup: "تم الاستلام من المتجر",
  picked_up: "تم التسليم للزبون",
};

function DeliveryCard({
  order,
  onAccept,
  onAdvance,
}: {
  order: Order & { store?: { name: string }; address?: { address_text: string } };
  onAccept?: () => void;
  onAdvance?: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <SectionCard style={{ marginBottom: tokens.spacing.md }}>
      <WorkspaceText variant="title">{order.store?.name || "متجر"}</WorkspaceText>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", marginTop: tokens.spacing.xs }}>
        <MapPin size={16} color={colors.textSecondary} />
        <WorkspaceText color="secondary" style={{ marginRight: tokens.spacing.xs, flex: 1 }}>
          {order.address?.address_text || "العنوان غير متوفر"}
        </WorkspaceText>
      </View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", marginTop: tokens.spacing.xs }}>
        <ShoppingCart size={16} color={colors.textSecondary} />
        <WorkspaceText color="secondary" style={{ marginRight: tokens.spacing.xs }}>
          {`أجرة التوصيل: ${(order.delivery_fee_minor / 100).toFixed(2)} د.ج`}
        </WorkspaceText>
      </View>

      {onAccept && (
        <WorkspaceButton title="قبول التوصيلة" onPress={onAccept} style={{ marginTop: tokens.spacing.md }} />
      )}
      {onAdvance && nextStatus && (
        <WorkspaceButton
          title={NEXT_LABEL[order.status] || "تحديث الحالة"}
          onPress={onAdvance}
          style={{ marginTop: tokens.spacing.md }}
        />
      )}
    </SectionCard>
  );
}

export default function DriverDeliveriesScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver } = useDriver(userId || "");
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const { orders, availableOrders, loading, acceptOrder, updateStatus, refreshOrders } = useDriverOrders(
    userId || "",
    driver?.zone_id
  );

  const activeOrders = orders.filter((o) => ["ready_for_pickup", "picked_up"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "available", label: "المتاحة" },
    { key: "active", label: "الجارية" },
    { key: "completed", label: "المكتملة" },
  ];

  const dataForTab = activeTab === "available" ? availableOrders : activeTab === "active" ? activeOrders : completedOrders;

  if (loading && orders.length === 0 && availableOrders.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل التوصيلات..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <View
        style={{
          flexDirection: "row-reverse",
          backgroundColor: colors.bgElevated,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: 1,
          padding: tokens.spacing.sm,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: tokens.spacing.md,
                alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.primary : "transparent",
              }}
            >
              <WorkspaceText variant="caption" color={active ? "brand" : "secondary"}>
                {tab.label}
              </WorkspaceText>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={refreshOrders} style={{ padding: tokens.spacing.sm, justifyContent: "center" }}>
          <RefreshCcw size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {dataForTab.length === 0 ? (
        <EmptyState message="لا توجد توصيلات في هذا القسم." />
      ) : (
        <FlatList
          data={dataForTab}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeliveryCard
              order={item as any}
              onAccept={activeTab === "available" ? () => acceptOrder(item.id) : undefined}
              onAdvance={activeTab === "active" ? () => updateStatus(item.id, NEXT_STATUS[item.status]!) : undefined}
            />
          )}
          contentContainerStyle={{ paddingTop: tokens.spacing.md }}
          refreshing={loading}
          onRefresh={refreshOrders}
        />
      )}
    </WorkspaceScreen>
  );
}
