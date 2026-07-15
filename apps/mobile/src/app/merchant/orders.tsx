import React, { useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
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

type TabKey = "new" | "active" | "completed";

export default function MerchantOrdersScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const { orders, loading, updateStatus, refreshOrders } = useMerchantOrders(userId || "");

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "new") return order.status === "pending";
    if (activeTab === "active") return ["accepted", "preparing", "ready_for_pickup"].includes(order.status);
    return ["picked_up", "delivered", "cancelled", "disputed"].includes(order.status);
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    await updateStatus(orderId, newStatus);
  };

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "new", label: "الجديدة", badge: orders.filter((o) => o.status === "pending").length },
    { key: "active", label: "الحالية" },
    { key: "completed", label: "السابقة" },
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
              <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                {!!tab.badge && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.error,
                      marginLeft: tokens.spacing.xs,
                    }}
                  />
                )}
                <WorkspaceText variant="caption" color={active ? "brand" : "secondary"}>
                  {tab.label}
                </WorkspaceText>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={refreshOrders} style={{ padding: tokens.spacing.sm, justifyContent: "center" }}>
          <RefreshCcw size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState message="لا توجد طلبات في هذا القسم." />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MerchantOrderCard order={item} onUpdateStatus={handleStatusUpdate} />}
          contentContainerStyle={{ paddingVertical: tokens.spacing.md }}
          refreshing={loading}
          onRefresh={refreshOrders}
        />
      )}
    </WorkspaceScreen>
  );
}
