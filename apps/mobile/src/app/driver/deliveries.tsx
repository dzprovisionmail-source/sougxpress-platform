import React, { useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { MapPin, ShoppingCart, RefreshCcw, Store, Navigation, X } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders, { DriverOrder } from "@/hooks/useDriverOrders";
import { OrderStatus } from "@/types/schema-03-core";
import { openLocationInMaps, openAddressSearchInMaps, openGoogleMapsNavigation } from "@/utils/maps";
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
  ready_for_pickup: "بدء التوصيل (تم الاستلام من المتجر)",
  picked_up: "تم التسليم للزبون",
};

function DeliveryCard({
  order,
  onAccept,
  onReject,
  onAdvance,
}: {
  order: DriverOrder;
  onAccept?: () => void;
  onReject?: () => void;
  onAdvance?: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  const nextStatus = NEXT_STATUS[order.status];
  const storeName = order.store?.name || "متجر";
  const storeCity = order.store?.zone?.city;
  const lat = order.address?.latitude;
  const lng = order.address?.longitude;

  const handleOpenCustomerLocation = () => {
    if (lat != null && lng != null) {
      openLocationInMaps(lat, lng, order.address?.address_text);
    }
  };

  const handleOpenMerchantLocation = () => {
    const query = storeCity ? `${storeName} ${storeCity}` : storeName;
    openAddressSearchInMaps(query);
  };

  const handleNavigate = () => {
    if (lat != null && lng != null) {
      openGoogleMapsNavigation(lat, lng);
    }
  };

  return (
    <SectionCard style={{ marginBottom: tokens.spacing.md }}>
      <WorkspaceText variant="title">{storeName}</WorkspaceText>
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

      <View style={{ flexDirection: "row-reverse", marginTop: tokens.spacing.md, gap: tokens.spacing.sm }}>
        <TouchableOpacity
          onPress={handleOpenMerchantLocation}
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Store size={16} color={colors.textSecondary} />
          <WorkspaceText color="secondary" style={{ marginRight: tokens.spacing.xs }} variant="caption">
            موقع المتجر
          </WorkspaceText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleOpenCustomerLocation}
          disabled={lat == null || lng == null}
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            opacity: lat == null || lng == null ? 0.5 : 1,
          }}
        >
          <MapPin size={16} color={colors.textSecondary} />
          <WorkspaceText color="secondary" style={{ marginRight: tokens.spacing.xs }} variant="caption">
            موقع الزبون
          </WorkspaceText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNavigate}
          disabled={lat == null || lng == null}
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radius.sm,
            backgroundColor: colors.primary,
            opacity: lat == null || lng == null ? 0.5 : 1,
          }}
        >
          <Navigation size={16} color={colors.textOnBrand} />
          <WorkspaceText style={{ marginRight: tokens.spacing.xs, color: colors.textOnBrand }} variant="caption">
            الملاحة
          </WorkspaceText>
        </TouchableOpacity>
      </View>

      {onAccept && (
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.md }}>
          <WorkspaceButton title="قبول التوصيلة" onPress={onAccept} style={{ flex: 1 }} />
          <WorkspaceButton
            title="رفض"
            variant="outline"
            icon={<X color={colors.primary} size={16} />}
            onPress={onReject}
            style={{ flex: 1 }}
          />
        </View>
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
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const { orders, availableOrders, loading, acceptOrder, updateStatus, refreshOrders } = useDriverOrders(
    userId || "",
    driver?.zone_id
  );

  const activeOrders = orders.filter((o) => ["ready_for_pickup", "picked_up"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered");
  const visibleAvailableOrders = availableOrders.filter((o) => !rejectedIds.has(o.id));

  const tabs: { key: TabKey; label: string }[] = [
    { key: "available", label: "المتاحة" },
    { key: "active", label: "الجارية" },
    { key: "completed", label: "المكتملة" },
  ];

  const dataForTab =
    activeTab === "available" ? visibleAvailableOrders : activeTab === "active" ? activeOrders : completedOrders;

  const handleReject = (orderId: string) => {
    setRejectedIds((prev) => new Set(prev).add(orderId));
  };

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
              order={item}
              onAccept={activeTab === "available" ? () => acceptOrder(item.id) : undefined}
              onReject={activeTab === "available" ? () => handleReject(item.id) : undefined}
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
