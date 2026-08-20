import React, { useState, useCallback } from "react";
import { View, FlatList, TouchableOpacity, Alert, Linking, ActivityIndicator, RefreshControl } from "react-native";
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
import { getOrCreateConversation, getCommercialPhone, logCallPress } from "@/services/chat.service";
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
  const [calling, setCalling] = useState<string | null>(null);

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

  const handleCall = async (targetRole: 'customer' | 'merchant', receiverId: string) => {
    if (!order.id || !receiverId || calling) return;
    
    setCalling(targetRole);
    try {
      const { data: phone, error } = await getCommercialPhone(order.id, targetRole);
      
      if (error || !phone) {
        Alert.alert("تنبيه", "لا يمكن استرجاع رقم الهاتف في هذه المرحلة أو أن العلاقة التجارية غير نشطة.");
        return;
      }

      const relationshipType = targetRole === 'customer' ? 'customer_courier' : 'merchant_courier';
      await logCallPress(order.id, receiverId, relationshipType);

      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.error("Error handling call:", err);
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة الاتصال.");
    } finally {
      setCalling(null);
    }
  };

  const handleWhatsApp = async () => {
    const { data: phone } = await getCommercialPhone(order.id, 'customer');
    if (phone) {
      const cleanPhone = phone.replace(/^0/, "");
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
    Alert.alert("رفض التوصيلة", "هل أنت متأكد من رفض هذه التوصيلة؟", [
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

        {order.store?.merchant_id && (
          <TouchableOpacity
            onPress={() => handleCall('merchant', order.store.merchant_id)}
            disabled={calling === 'merchant'}
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
            {calling === 'merchant' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Phone size={16} color={colors.primary} />
            )}
            <WorkspaceText color="primary" style={{ marginRight: 4 }} variant="caption">
              اتصال بالمتجر
            </WorkspaceText>
          </TouchableOpacity>
        )}

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
      </View>

      {status !== "pending" && status !== "delivered" && status !== "cancelled" && status !== "failed" && (
        <View style={{ marginTop: tokens.spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: tokens.spacing.sm }}>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, flexWrap: "wrap" }}>
            <TouchableOpacity
              onPress={() => handleCall('customer', order.customer?.id)}
              disabled={calling === 'customer'}
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
              {calling === 'customer' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Phone size={16} color={colors.primary} />
              )}
              <WorkspaceText color="primary" style={{ marginRight: 4 }} variant="caption">
                اتصال بالزبون
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
                borderColor: colors.primary + "30",
                backgroundColor: colors.primary + "08",
                minWidth: 80,
              }}
            >
              <MessageCircle size={16} color={colors.primary} />
              <WorkspaceText color="primary" style={{ marginRight: 4 }} variant="caption">
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
                borderColor: colors.success + "30",
                backgroundColor: colors.success + "08",
                minWidth: 80,
              }}
            >
              <MessageCircle size={16} color={colors.success} />
              <WorkspaceText style={{ color: colors.success, marginRight: 4 }} variant="caption">
                واتساب
              </WorkspaceText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNavigate}
              style={{
                flex: 1,
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: tokens.spacing.sm,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: colors.info + "30",
                backgroundColor: colors.info + "08",
                minWidth: 80,
              }}
            >
              <Navigation size={16} color={colors.info} />
              <WorkspaceText style={{ color: colors.info, marginRight: 4 }} variant="caption">
                موقع الزبون
              </WorkspaceText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {status === "pending" && (
        <View style={{ flexDirection: "row-reverse", marginTop: tokens.spacing.md, gap: tokens.spacing.sm }}>
          <WorkspaceButton
            title={NEXT_LABEL.pending!}
            onPress={handleAccept}
            style={{ flex: 1 }}
          />
          <WorkspaceButton
            title="تجاهل"
            variant="outline"
            onPress={handleReject}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {status !== "pending" && status !== "delivered" && status !== "cancelled" && status !== "failed" && nextStatus && (
        <WorkspaceButton
          title={NEXT_LABEL[status]!}
          onPress={handleAdvance}
          style={{ marginTop: tokens.spacing.md }}
        />
      )}
    </SectionCard>
  );
}

export default function DriverDeliveriesScreen() {
  const { userId } = useCurrentUserId();
  const { orders, availableOrders, loading, refreshOrders, acceptOrder, updateStatus } = useDriverOrders(userId || "");
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  const activeDeliveries = orders.filter(o => 
    ["accepted", "arrived_at_store", "picked_up", "out_for_delivery"].includes(o.assignment_status)
  );
  
  const completedDeliveries = orders.filter(o => 
    ["delivered", "cancelled", "failed"].includes(o.assignment_status)
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "active", label: "النشطة", count: activeDeliveries.length },
    { key: "available", label: "المتاحة", count: availableOrders.length },
    { key: "completed", label: "المكتملة", count: completedDeliveries.length },
  ];

  const renderContent = () => {
    const data =
      activeTab === "active"
        ? activeDeliveries
        : activeTab === "available"
        ? availableOrders
        : completedDeliveries;

    if (loading && data.length === 0) {
      return <LoadingState message="جاري التحميل..." />;
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeliveryCard
            order={item}
            onAccept={() => acceptOrder(item.assignment_id)}
            onReject={() => {}}
            onAdvance={(status) => updateStatus(item.assignment_id, status)}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshOrders} />}
        ListEmptyComponent={<EmptyState message="لا توجد توصيلات في هذا القسم" />}
      />
    );
  };

  return (
    <WorkspaceScreen>
      <View style={{ flexDirection: "row-reverse", padding: 8, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#eee" }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? "#007AFF" : "transparent",
            }}
          >
            <WorkspaceText
              variant="caption"
              color={activeTab === tab.key ? "primary" : "secondary"}
              style={{ fontWeight: activeTab === tab.key ? "700" : "400" }}
            >
              {`${tab.label} (${tab.count})`}
            </WorkspaceText>
          </TouchableOpacity>
        ))}
      </View>
      {renderContent()}
    </WorkspaceScreen>
  );
}
