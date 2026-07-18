import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { RefreshCcw } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useMerchantOrders from "@/hooks/useMerchantOrders";
import { OrderStatus } from "@/types/schema-03-core";
import MerchantOrderCard from "@/components/orders/MerchantOrderCard";
import {
  WorkspaceScreen,
  WorkspaceText,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

type TabKey = "new" | "preparing" | "ready" | "completed" | "cancelled";

const TAB_STATUSES: Record<TabKey, OrderStatus[]> = {
  new: ["pending"],
  preparing: ["accepted", "preparing"],
  ready: ["ready_for_pickup"],
  completed: ["picked_up", "delivered"],
  cancelled: ["cancelled", "disputed"],
};

export default function MerchantOrdersScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const { orders, loading, updateStatus, refreshOrders } = useMerchantOrders(
    userId ?? ""
  );

  const filteredOrders = orders.filter((order) =>
    TAB_STATUSES[activeTab].includes(order.status)
  );

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    await updateStatus(orderId, newStatus);
  };

  const tabs: { key: TabKey; label: string }[] = [
    {
      key: "new",
      label: `الجديدة${orders.filter((o) => o.status === "pending").length > 0 ? ` (${orders.filter((o) => o.status === "pending").length})` : ""}`,
    },
    { key: "preparing", label: "التحضير" },
    { key: "ready", label: "الجاهزة" },
    { key: "completed", label: "المكتملة" },
    { key: "cancelled", label: "الملغية" },
  ];

  if (loading && orders.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل الطلبات..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      {/* Tab bar */}
      <View
        style={{
          backgroundColor: colors.bgElevated,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            padding: tokens.spacing.xs,
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
                  paddingVertical: tokens.spacing.sm,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: active
                    ? colors.primary
                    : "transparent",
                }}
              >
                <WorkspaceText
                  variant="caption"
                  color={active ? "brand" : "secondary"}
                  style={{
                    fontWeight: active ? "700" : "400",
                    fontSize: 12,
                  }}
                >
                  {tab.label}
                </WorkspaceText>
              </TouchableOpacity>
            );
          })}

          {/* Refresh button */}
          <TouchableOpacity
            onPress={refreshOrders}
            style={{
              padding: tokens.spacing.sm,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <RefreshCcw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState message="لا توجد طلبات في هذا القسم." />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MerchantOrderCard
              order={item}
              onUpdateStatus={handleStatusUpdate}
            />
          )}
          contentContainerStyle={{ paddingVertical: tokens.spacing.md }}
          refreshing={loading}
          onRefresh={refreshOrders}
        />
      )}
    </WorkspaceScreen>
  );
}
