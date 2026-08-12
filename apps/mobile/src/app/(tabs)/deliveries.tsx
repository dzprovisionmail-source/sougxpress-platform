import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourierOrders from "@/hooks/useCourierOrders";
import { TOKENS } from "@/constants/tokens";
import { Bike, MapPin, Phone, MessageCircle, ChevronRight } from "lucide-react-native";
import { DeliveryStatus, updateDeliveryStatus } from "@/services/courier-delivery.service";

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

export default function DeliveriesScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { activeDeliveries, loading, refreshDeliveries } = useCourierOrders(userId || "");

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return "متاحة";
      case "accepted": return "مقبولة";
      case "arrived_at_store": return "في المتجر";
      case "picked_up": return "تم الاستلام";
      case "out_for_delivery": return "في الطريق";
      case "delivered": return "تم التوصيل";
      case "cancelled": return "ملغاة";
      case "failed": return "فشلت";
      default: return status;
    }
  };

  const handleAdvance = async (id: string, currentStatus: DeliveryStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;

    const confirmMessage = `تأكيد تغيير الحالة إلى: ${NEXT_LABEL[currentStatus]}؟`;
    Alert.alert("تحديث الحالة", confirmMessage, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد",
        onPress: async () => {
          const res = await updateDeliveryStatus(id, userId || "", nextStatus);
          if (res.error) {
            Alert.alert("خطأ", res.error);
          } else {
            refreshDeliveries();
          }
        }
      },
    ]);
  };

  if (loading && activeDeliveries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>التوصيلات النشطة</Text>

      {activeDeliveries.length === 0 ? (
        <View style={styles.center}>
          <Bike size={64} color={colors.textDisabled} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد توصيلات نشطة حالياً</Text>
        </View>
      ) : (
        activeDeliveries.map((delivery) => (
          <View
            key={delivery.id}
            style={[styles.deliveryCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.deliveryHeader}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.deliveryStatus, { color: colors.primary }]}>
                  {statusLabel(delivery.status)}
                </Text>
              </View>
              <Text style={[styles.deliveryId, { color: colors.textSecondary }]}>
                #{delivery.id.slice(0, 8)}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Text style={[styles.storeName, { color: colors.textPrimary }]}>{delivery.store_name}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>المتجر</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={2}>
                  {delivery.address_text}
                </Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>العنوان</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.customerName, { color: colors.textPrimary }]}>{delivery.customer_name}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الزبون</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                onPress={() => {
                  if (delivery.customer_phone) {
                    Linking.openURL(`tel:${delivery.customer_phone}`);
                  }
                }}
              >
                <Phone size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.success + '10' }]}
                onPress={() => {
                  if (delivery.customer_phone) {
                    const cleanPhone = delivery.customer_phone.replace(/^0/, "");
                    Linking.openURL(`whatsapp://send?phone=+213${cleanPhone}`);
                  }
                }}
              >
                <MessageCircle size={20} color={colors.success} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.advanceButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAdvance(delivery.id, delivery.status)}
              >
                <Text style={styles.advanceButtonText}>
                  {NEXT_LABEL[delivery.status] || "تحديث الحالة"}
                </Text>
                <ChevronRight size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: TOKENS.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: TOKENS.spacing.xl,
    textAlign: "right",
    fontFamily: 'System',
  },
  center: {
    alignItems: "center",
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  deliveryCard: {
    padding: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.md,
    ...TOKENS.shadows.small,
  },
  deliveryHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deliveryId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  deliveryStatus: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardBody: {
    gap: 12,
    marginBottom: TOKENS.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  addressText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advanceButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  advanceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
