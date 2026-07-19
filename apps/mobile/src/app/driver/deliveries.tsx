import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, Alert, Linking } from "react-native";
import { MapPin, ShoppingCart, RefreshCcw, Store, Navigation, X, Phone, MessageCircle } from "lucide-react-native";

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

const STATUS_FLOW: OrderStatus[] = ["pending", "accepted", "preparing", "ready_for_pickup", "picked_up", "delivered"];

function StatusBadge({ status }: { status: OrderStatus }) {
  const { colors } = useAppTheme();
  const label =
    status === "ready_for_pickup"
      ? "جاهز للاستلام"
      : status === "picked_up"
      ? "في الطريق"
      : status === "delivered"
      ? "مكتمل"
      : status === "cancelled"
      ? "ملغي"
      : status === "disputed"
      ? "متنازع عليه"
      : status;

  const color =
    status === "delivered"
      ? colors.success
      : status === "cancelled" || status === "disputed"
      ? colors.error
      : status === "picked_up"
      ? colors.info
      : colors.warning;

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: color + "18",
        borderWidth: 1,
        borderColor: color + "44",
      }}
    >
      <WorkspaceText color="secondary" variant="caption" style={{ color }}>
        {label}
      </WorkspaceText>
    </View>
  );
}

function TimelineStep({ label, active }: { label: string; active: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: active ? colors.primary : colors.borderSubtle,
          borderWidth: active ? 0 : 1,
          borderColor: colors.textDisabled,
        }}
      />
      <WorkspaceText variant="caption" color={active ? "primary" : "secondary"}>
        {label}
      </WorkspaceText>
    </View>
  );
}

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

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

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

  const handleCall = () => {
    const phone = order.address?.address_text || "";
    const phoneMatch = phone.match(/0[0-9]{9}/);
    if (phoneMatch) {
      Linking.openURL(`tel:${phoneMatch[0]}`);
    }
  };

  const handleWhatsApp = () => {
    const phone = order.address?.address_text || "";
    const phoneMatch = phone.match(/0[0-9]{9}/);
    if (phoneMatch) {
      Linking.openURL(`whatsapp://send?phone=+213${phoneMatch[0].substring(1)}`);
    }
  };

  const handleAccept = () => {
    Alert.alert("قبول التوصيلة", "هل أنت متأكد من قبول هذه التوصيلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "قبول", onPress: onAccept },
    ]);
  };

  const handleReject = () => {
    Alert.alert("رفض التوصيلة", "هل أنت متأكد من رفض هذه التوصيلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "رفض", style: "destructive", onPress: onReject },
    ]);
  };

  const handleAdvance = () => {
    const confirmMessage =
      order.status === "ready_for_pickup"
        ? "تأكيد الاستلام من المتجر وبدء التوصيل للزبون؟"
        : "تأكيد تسليم الطلب للزبون؟";
    Alert.alert("تحديث الحالة", confirmMessage, [
      { text: "إلغاء", style: "cancel" },
      { text: "تأكيد", onPress: onAdvance },
    ]);
  };

  return (
    <SectionCard style={{ marginBottom: tokens.spacing.md }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <WorkspaceText variant="title" style={{ fontSize: tokens.typography.sizes.md }}>
          {storeName}
        </WorkspaceText>
        <StatusBadge status={order.status} />
      </View>

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

      {order.status !== "delivered" && order.status !== "cancelled" && (
        <View style={{ marginTop: tokens.spacing.md }}>
          <WorkspaceText color="secondary" variant="caption" style={{ marginBottom: tokens.spacing.xs }}>
            مسار التوصيل
          </WorkspaceText>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: tokens.spacing.xs, flexWrap: "wrap" }}>
            {STATUS_FLOW.map((s, idx) => (
              <React.Fragment key={s}>
                <TimelineStep
                  label={
                    s === "ready_for_pickup"
                      ? "جاهز"
                      : s === "picked_up"
                      ? "في الطريق"
                      : s === "delivered"
                      ? "مكتمل"
                      : s
                  }
                  active={idx <= currentStepIndex}
                />
                {idx < STATUS_FLOW.length - 1 && (
                  <View
                    style={{
                      width: 16,
                      height: 1,
                      backgroundColor: idx < currentStepIndex ? colors.primary : colors.borderSubtle,
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: "row-reverse", marginTop: tokens.spacing.md, gap: tokens.spacing.sm, flexWrap: "wrap" }}>
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
            minWidth: 80,
          }}
        >
          <Store size={16} color={colors.textSecondary} />
          <WorkspaceText color="secondary" style={{ marginRight: 4 }} variant="caption">
            المتجر
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
            minWidth: 80,
          }}
        >
          <MapPin size={16} color={colors.textSecondary} />
          <WorkspaceText color="secondary" style={{ marginRight: 4 }} variant="caption">
            الزبون
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
            minWidth: 80,
          }}
        >
          <Navigation size={16} color={colors.textOnBrand} />
          <WorkspaceText style={{ marginRight: 4, color: colors.textOnBrand }} variant="caption">
            ملاحة
          </WorkspaceText>
        </TouchableOpacity>
      </View>

      {(order.status === "ready_for_pickup" || order.status === "picked_up") && (
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
          <TouchableOpacity
            onPress={handleCall}
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
            <Phone size={16} color={colors.textSecondary} />
            <WorkspaceText color="secondary" variant="caption" style={{ marginRight: 4 }}>
              اتصال
            </WorkspaceText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWhatsApp}
            style={{
              flex: 1,
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: tokens.spacing.sm,
              borderRadius: tokens.radius.sm,
              borderWidth: 1,
              borderColor: colors.success,
            }}
          >
            <MessageCircle size={16} color={colors.success} />
            <WorkspaceText color="success" variant="caption" style={{ marginRight: 4 }}>
              واتساب
            </WorkspaceText>
          </TouchableOpacity>
        </View>
      )}

      {onAccept && (
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.md }}>
          <WorkspaceButton title="قبول التوصيلة" onPress={handleAccept} style={{ flex: 1 }} />
          <WorkspaceButton
            title="رفض"
            variant="outline"
            icon={<X color={colors.primary} size={16} />}
            onPress={handleReject}
            style={{ flex: 1 }}
          />
        </View>
      )}
      {onAdvance && nextStatus && (
        <WorkspaceButton
          title={NEXT_LABEL[order.status] || "تحديث الحالة"}
          onPress={handleAdvance}
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

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "available", label: "المتاحة", count: visibleAvailableOrders.length },
    { key: "active", label: "الجارية", count: activeOrders.length },
    { key: "completed", label: "المكتملة", count: completedOrders.length },
  ];

  const dataForTab =
    activeTab === "available" ? visibleAvailableOrders : activeTab === "active" ? activeOrders : completedOrders;

  const handleReject = (orderId: string) => {
    Alert.alert("رفض التوصيلة", "هل أنت متأكد من رفض هذه التوصيلة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفض",
        style: "destructive",
        onPress: () => setRejectedIds((prev) => new Set(prev).add(orderId)),
      },
    ]);
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
                {tab.label} ({tab.count})
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
