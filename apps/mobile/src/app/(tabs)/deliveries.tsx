import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourierOrders from "@/hooks/useCourierOrders";
import { TOKENS } from "@/constants/tokens";
import { Bike, MapPin, Phone, MessageCircle, ChevronRight, LogIn, ShoppingBag, Store, CheckCircle, X, Calendar, Clock } from "lucide-react-native";
import { Typography, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { DeliveryStatus, updateDeliveryStatus } from "@/services/courier-delivery.service";
import { getOrCreateConversation, getCommercialPhone, logCallPress } from "@/services/chat.service";

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
  const { activeDeliveries, completedDeliveries, loading, refreshDeliveries } = useCourierOrders(userId || "");
  
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [isGuest, setIsGuest] = useState(false);
  const [callingDeliveryId, setCallingDeliveryId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) setIsGuest(user === null);
    });
  }, []);

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

  const handleCall = async (delivery: any, role: "customer" | "merchant") => {
    if (!delivery.order_id || callingDeliveryId) return;

    const targetId = role === "customer" ? delivery.customer_id : delivery.merchant_id;
    if (!targetId) return;

    setCallingDeliveryId(delivery.id);
    try {
      const { data: phone, error } = await getCommercialPhone(delivery.order_id, role);
      if (error || !phone) {
        Alert.alert("تنبيه", "لا يمكن استرجاع رقم الهاتف في هذه المرحلة.");
        return;
      }

      await logCallPress(delivery.order_id, targetId, role === "customer" ? "customer_courier" : "merchant_courier");
      await Linking.openURL(`tel:${phone}`);
    } catch (error) {
      console.error("Error starting commercial call:", error);
      Alert.alert("خطأ", "تعذر فتح تطبيق الهاتف.");
    } finally {
      setCallingDeliveryId(null);
    }
  };

  const handleStartChat = async (delivery: any, type: "customer_courier" | "merchant_courier") => {
    const targetId = type === "customer_courier" ? delivery.customer_id : delivery.merchant_id;
    if (!delivery.order_id || !targetId) return;
    
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        targetId,
        type,
        delivery.order_id
      );
      if (error) throw error;
      if (conversationId) router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("خطأ", "تعذر فتح محادثة الطلب.");
    }
  };

  const handleAdvance = async (id: string, currentStatus: DeliveryStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;

    Alert.alert("تحديث الحالة", `تأكيد تغيير الحالة إلى: ${NEXT_LABEL[currentStatus]}؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد",
        onPress: async () => {
          const res = await updateDeliveryStatus(id, userId || "", nextStatus);
          if (res.error) Alert.alert("خطأ", res.error);
          else refreshDeliveries();
        }
      },
    ]);
  };

  const renderDeliveryCard = (delivery: any) => {
    const isCompleted = ["delivered", "cancelled", "failed"].includes(delivery.status);
    
    return (
      <View key={delivery.id} style={[styles.deliveryCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <View style={styles.deliveryHeader}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusDot, { backgroundColor: isCompleted ? (delivery.status === 'delivered' ? colors.success : colors.error) : colors.primary }]} />
            <Text style={[styles.deliveryStatus, { color: isCompleted ? (delivery.status === 'delivered' ? colors.success : colors.error) : colors.primary }]}>
              {statusLabel(delivery.status)}
            </Text>
          </View>
          <Text style={[styles.deliveryId, { color: colors.textSecondary }]}>#{delivery.id.slice(0, 8)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Store size={16} color={colors.primary} />
              <Text style={[styles.storeName, { color: colors.textPrimary }]}>{delivery.store_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={2}>{delivery.address_text}</Text>
          </View>

          {/* Itemized List */}
          {delivery.items && delivery.items.length > 0 && (
            <View style={[styles.itemsContainer, { backgroundColor: colors.bgBase }]}>
              {delivery.items.map((item: any) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.itemText, { color: colors.textPrimary }]}>{item.product?.name || 'منتج'}</Text>
                  <Text style={[styles.itemQty, { color: colors.textSecondary }]}>x{item.quantity}</Text>
                  <Text style={[styles.itemPrice, { color: colors.textPrimary }]}>{Math.round((item.line_total_minor || 0) / 100)} د.ج</Text>
                </View>
              ))}
              <View style={[styles.feeRow, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>رسوم التوصيل الثابتة</Text>
                <Text style={[styles.feeValue, { color: colors.primary }]}>200.00 د.ج</Text>
              </View>
            </View>
          )}

          {isCompleted && (
            <View style={[styles.completionInfo, { backgroundColor: delivery.status === 'delivered' ? colors.success + '08' : colors.error + '08' }]}>
              <View style={styles.timeRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleString('ar-DZ') : new Date(delivery.created_at).toLocaleDateString('ar-DZ')}
                </Text>
              </View>
              {delivery.status === 'delivered' && (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>تم التسليم بنجاح</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]} onPress={() => handleCall(delivery, "customer")} disabled={!!callingDeliveryId}>
              {callingDeliveryId === delivery.id ? <ActivityIndicator size="small" color={colors.primary} /> : <Phone size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.success + '10' }]} onPress={() => handleStartChat(delivery, "customer_courier")}>
              <MessageCircle size={20} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.advanceButton, { backgroundColor: colors.primary }]} onPress={() => handleAdvance(delivery.id, delivery.status)}>
              <Text style={styles.advanceButtonText}>{NEXT_LABEL[delivery.status] || "تحديث"}</Text>
              <ChevronRight size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase, justifyContent: 'center' }]}>
        <View style={styles.center}>
          <Bike size={80} color={colors.primary} />
          <Typography variant="h2" align="center">مرحباً بك في Soug-XPRESS</Typography>
          <Typography variant="body" color="secondary" align="center">يجب تسجيل الدخول كعامل توصيل.</Typography>
          <Button title="الدخول" onPress={() => router.push("/login")} variant="primary" style={{ width: '100%', marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface }]}>
        <Typography variant="h2" style={styles.headerTitle}>توصيلاتي التجارية</Typography>
        <View style={styles.tabBar}>
          <TouchableOpacity onPress={() => setActiveTab("active")} style={[styles.tab, activeTab === "active" && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: activeTab === "active" ? colors.primary : colors.textSecondary }]}>النشطة ({activeDeliveries.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("completed")} style={[styles.tab, activeTab === "completed" && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: activeTab === "completed" ? colors.primary : colors.textSecondary }]}>الأرشيف ({completedDeliveries.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: TOKENS.spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshDeliveries} />}
      >
        {activeTab === "active" ? (
          activeDeliveries.length === 0 ? (
            <View style={styles.center}><Bike size={64} color={colors.textDisabled} /><Text style={{ color: colors.textSecondary }}>لا توجد توصيلات نشطة</Text></View>
          ) : activeDeliveries.map(renderDeliveryCard)
        ) : (
          completedDeliveries.length === 0 ? (
            <View style={styles.center}><Calendar size={64} color={colors.textDisabled} /><Text style={{ color: colors.textSecondary }}>سجل التوصيلات فارغ</Text></View>
          ) : completedDeliveries.map(renderDeliveryCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: TOKENS.spacing.lg, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { textAlign: 'right', marginBottom: 15, fontWeight: '800' },
  tabBar: { flexDirection: 'row-reverse' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  center: { alignItems: "center", marginTop: 100, gap: 16 },
  deliveryCard: { padding: TOKENS.spacing.md, borderRadius: TOKENS.radius.lg, borderWidth: 1, marginBottom: TOKENS.spacing.md, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  deliveryHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deliveryStatus: { fontSize: 14, fontWeight: "700" },
  deliveryId: { fontSize: 12, fontFamily: 'monospace' },
  cardBody: { gap: 10 },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 },
  storeName: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'right' },
  addressText: { fontSize: 14, flex: 1, textAlign: 'right', lineHeight: 20 },
  itemsContainer: { padding: 10, borderRadius: 8, marginTop: 5 },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  itemText: { fontSize: 13, flex: 2, textAlign: 'right' },
  itemQty: { fontSize: 13, flex: 0.5, textAlign: 'center' },
  itemPrice: { fontSize: 13, flex: 1, textAlign: 'left', fontWeight: '600' },
  feeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  feeLabel: { fontSize: 12, fontWeight: '600' },
  feeValue: { fontSize: 13, fontWeight: '700' },
  completionInfo: { padding: 8, borderRadius: 6, marginTop: 5 },
  timeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 12 },
  actionRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
  actionButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  advanceButton: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  advanceButtonText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
