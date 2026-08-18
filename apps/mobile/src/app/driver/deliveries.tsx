import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, Alert, Linking } from "react-native";
import { MapPin, ShoppingCart, Store, Navigation, X, Phone, MessageCircle } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { openLocationInMaps, openAddressSearchInMaps, openGoogleMapsNavigation } from "@/utils/maps";
import {
  WorkspaceScreen,
  WorkspaceText,
  WorkspaceButton,
  SectionCard,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";
import { DeliveryStatus } from "@/services/courier-delivery.service";
import { getOrCreateConversation } from "@/services/chat.service";
import { useRouter } from "expo-router";

type TabKey = "available" | "active" | "completed";

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: "accepted",
  accepted: "arrived_at_store",
  arrived_at_store: "picked_up",
  picked_up: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_LABEL: Partial<Record<DeliveryStatus, string>> = {
  pending: "قبول التوصيلة",
  accepted: "وصلت للمتجر",
  arrived_at_store: "تم الاستلام من المتجر",
  picked_up: "بدء التوصيل للزبون",
  out_for_delivery: "تم التسليم للزبون",
};

const STATUS_FLOW: DeliveryStatus[] = ["pending", "accepted", "arrived_at_store", "picked_up", "out_for_delivery", "delivered"];

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const { colors } = useAppTheme();
  const label =
                        status === "pending"
                      ? "متاحة"
                      : status === "accepted"
                      ? "تم التعيين / مقبولة"
                      : status === "arrived_at_store"
                      ? "في المتجر"
                      : status === "picked_up"
                      ? "تم الاستلام"
                      : status === "out_for_delivery"
                      ? "في الطريق"
                      : status === "delivered"
                      ? "مكتملة"
                      : status === "cancelled"
                      ? "ملغاة"
                      : status === "failed"
                      ? "فشلت"
                      : status;

  const color =
    status === "delivered"
      ? colors.success
      : status === "cancelled" || status === "failed"
      ? colors.error
      : status === "out_for_delivery" || status === "picked_up"
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
  order: any;
  onAccept?: () => void;
  onReject?: () => void;
  onAdvance?: (status: DeliveryStatus) => void;
}) {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const status = order.assignment_status as DeliveryStatus;
  const nextStatus = NEXT_STATUS[status];
  const storeName = order.store?.name || "متجر";
  const storeCity = order.store?.zone?.city;
  const lat = order.address?.latitude;
  const lng = order.address?.longitude;
  const customerPhone = order.customer?.phone || "";

  const currentStepIndex = STATUS_FLOW.indexOf(status);

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
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/^0/, "");
      Linking.openURL(`whatsapp://send?phone=+213${cleanPhone}`);
    }
  };

  const handleStartChat = async (targetUserId: string, type: "customer_courier" | "merchant_courier") => {
    if (!targetUserId) return;
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        targetUserId,
        type,
        order.id
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleAccept = () => {
    Alert.alert("قبول التوصيلة", "هل أنت متأكد من قبول هذه التوصيلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "قبول", onPress: onAccept },
    ]);
  };

  const handleReject = () => {
    Alert.alert("رفض التوصيلة", "هل أنت متأكد من رفض cette التوصيلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "رفض", style: "destructive", onPress: onReject },
    ]);
  };

  const handleAdvance = () => {
    if (!nextStatus) return;
    const confirmMessage = `تأكيد تغيير الحالة إلى: ${NEXT_LABEL[status]}؟`;
    Alert.alert("تحديث الحالة", confirmMessage, [
      { text: "إلغاء", style: "cancel" },
      { text: "تأكيد", onPress: () => onAdvance?.(nextStatus) },
    ]);
  };

  return (
    <SectionCard style={{ marginBottom: tokens.spacing.md }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <WorkspaceText variant="title" style={{ fontSize: tokens.typography.sizes.md }}>
          {storeName}
        </WorkspaceText>
        <StatusBadge status={status} />
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

      {status !== "delivered" && status !== "cancelled" && status !== "failed" && (
        <View style={{ marginTop: tokens.spacing.md }}>
          <WorkspaceText color="secondary" variant="caption" style={{ marginBottom: tokens.spacing.xs }}>
            مسار التوصيل
          </WorkspaceText>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: tokens.spacing.xs, flexWrap: "wrap" }}>
            {STATUS_FLOW.map((s, idx) => (
              <React.Fragment key={s}>
                <TimelineStep
                  label={
                    s === "pending" ? "متاحة" :
                    s === "accepted" ? "مقبولة" :
                    s === "arrived_at_store" ? "في المتجر" :
                    s === "picked_up" ? "استلمت" :
                    s === "out_for_delivery" ? "في الطريق" :
                    s === "delivered" ? "مكتملة" : s
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
          onPress={() => handleStartChat(order.store?.merchant_id, "merchant_courier")}
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: colors.primary + "30",
            backgroundColor: colors.primary + "08",
            minWidth: 80,
          }}
        >
          <MessageCircle size={16} color={colors.primary} />
          <WorkspaceText color="primary" style={{ marginRight: 4 }} variant="caption">
            شات المتجر
          </WorkspaceText>
        </TouchableOpacity>
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

      {status !== "pending" && status !== "delivered" && status !== "cancelled" && (
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
            onPress={() => handleStartChat(order.customer?.id, "customer_courier")}
            style={{
              flex: 1,
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: tokens.spacing.sm,
              borderRadius: tokens.radius.sm,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.primary + "08",
            }}
          >
            <MessageCircle size={16} color={colors.primary} />
            <WorkspaceText color="primary" variant="caption" style={{ marginRight: 4 }}>
              شات الزبون
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

      {status === "pending" && onAccept && (
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.md }}>
          <WorkspaceButton title="قبول التوصيلة" onPress={handleAccept} style={{ flex: 1 }} />
          <WorkspaceButton
            title="تجاهل"
            variant="outline"
            icon={<X color={colors.primary} size={16} />}
            onPress={onReject}
            style={{ flex: 1 }}
          />
        </View>
      )}
      {status !== "pending" && status !== "delivered" && status !== "cancelled" && status !== "failed" && onAdvance && nextStatus && (
        <WorkspaceButton
          title={NEXT_LABEL[status] || "تحديث الحالة"}
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
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const { orders, availableOrders, loading, acceptOrder, updateStatus, refreshOrders } = useDriverOrders(
    userId || "",
    driver?.zone_id
  );

  const activeOrders = orders.filter((o) => ["accepted", "arrived_at_store", "picked_up", "out_for_delivery"].includes(o.assignment_status));
  const completedOrders = orders.filter((o) => o.assignment_status === "delivered");
  const visibleAvailableOrders = availableOrders.filter((o) => !ignoredIds.has(o.assignment_id));

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "available", label: "المتاحة", count: visibleAvailableOrders.length },
    { key: "active", label: "الجارية", count: activeOrders.length },
    { key: "completed", label: "المكتملة", count: completedOrders.length },
  ];

  const dataForTab =
    activeTab === "available" ? visibleAvailableOrders : activeTab === "active" ? activeOrders : completedOrders;

  const handleIgnore = (id: string) => {
    setIgnoredIds((prev) => new Set(prev).add(id));
  };

  const handleAccept = async (id: string) => {
    const success = await acceptOrder(id);
    if (success) {
      setActiveTab("active");
      refreshOrders();
    } else {
      Alert.alert("خطأ", "فشل قبول التوصيلة. ربما تم قبولها من قبل موصل آخر.");
    }
  };

  const handleAdvance = async (id: string, nextStatus: DeliveryStatus) => {
    const success = await updateStatus(id, nextStatus);
    if (success) {
      refreshOrders();
    } else {
      Alert.alert("خطأ", "فشل تحديث حالة التوصيلة.");
    }
  };

  if (loading && orders.length === 0 && availableOrders.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جari تحميل التوصيلات..." />
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
                alignItems: "center",
                paddingVertical: tokens.spacing.sm,
                borderBottomWidth: active ? 2 : 0,
                borderBottomColor: colors.primary,
              }}
            >
              <WorkspaceText
                variant="caption"
                style={{
                  color: active ? colors.primary : colors.textSecondary,
                  fontWeight: active ? "700" : "400",
                }}
              >
                {`${tab.label} (${tab.count})`}
              </WorkspaceText>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={dataForTab}
        keyExtractor={(item) => item.assignment_id}
        renderItem={({ item }) => (
          <DeliveryCard
            order={item}
            onAccept={activeTab === "available" ? () => handleAccept(item.assignment_id) : undefined}
            onReject={activeTab === "available" ? () => handleIgnore(item.assignment_id) : undefined}
            onAdvance={activeTab === "active" ? (status) => handleAdvance(item.assignment_id, status) : undefined}
          />
        )}
        contentContainerStyle={{ padding: tokens.spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState
            message={
              activeTab === "available"
                ? "لا توجد طلبات متاحة في منطقتك حالياً"
                : activeTab === "active"
                ? "ليس لديك أي توصيلات جارية حالياً"
                : "لم تقم بإكمال أي توصيلات بعد"
            }
          />
        }
      />
    </WorkspaceScreen>
  );
}
