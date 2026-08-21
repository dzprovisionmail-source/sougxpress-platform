import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  I18nManager,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
  Badge,
  Header,
  Button,
  EmptyState,
  Price,
} from "@/components/ui";
import {
  Clock,
  MapPin,
  Store,
  User,
  MessageCircle,
  Phone,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getOrCreateConversation, getCommercialPhone, logCallPress } from "@/services/chat.service";
import useCourierOrders from "@/hooks/useCourierOrders";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";

export default function CourierOrdersTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId, loading: authLoading } = useCurrentUserId();
  const isRTL = I18nManager.isRTL;

  const { activeDeliveries, loading, refreshDeliveries } = useCourierOrders(userId || "");
  const [calling, setCalling] = useState<string | null>(null);

  const handleStartChat = async (targetUserId: string, type: "customer_courier" | "merchant_courier", orderId: string) => {
    if (!targetUserId || !orderId) return;
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        targetUserId,
        type,
        orderId
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      Alert.alert("خطأ", "فشل بدء المحادثة.");
    }
  };

  const handleCall = async (orderId: string, receiverId: string, targetRole: 'customer' | 'merchant') => {
    if (!orderId || !receiverId || calling) return;
    
    setCalling(receiverId);
    try {
      const { data: phone, error } = await getCommercialPhone(orderId, targetRole);
      
      if (error || !phone) {
        Alert.alert("تنبيه", "رقم الهاتف متاح فقط للطلبات النشطة.");
        return;
      }

      const rel = targetRole === 'customer' ? 'customer_courier' : 'merchant_courier';
      await logCallPress(orderId, receiverId, rel);
      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      Alert.alert("خطأ", "فشل بدء الاتصال.");
    } finally {
      setCalling(null);
    }
  };

  const getStatusBadgeVariant = (status: string): "warning" | "info" | "success" | "error" | "default" => {
    switch (status) {
      case "pending": return "warning";
      case "accepted":
      case "arrived_at_store":
      case "picked_up":
      case "out_for_delivery": return "info";
      case "delivered": return "success";
      case "cancelled": return "error";
      default: return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "بانتظار قبولك";
      case "accepted": return "مقبول";
      case "arrived_at_store": return "في المتجر";
      case "picked_up": return "تم الاستلام";
      case "out_for_delivery": return "قيد التوصيل";
      case "delivered": return "تم التوصيل";
      case "cancelled": return "ملغى";
      default: return status;
    }
  };

  const renderDeliveryItem = ({ item }: { item: any }) => {
    const deliveryFee = Number(item.delivery_fee_minor || 20000);
    const total = Number(item.total_minor || 0);
    const items = Array.isArray(item.items) ? item.items : [];

    return (
      <Card key={item.id} style={styles.deliveryCard}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.orderIdCol}>
            <Typography variant="h3">توصيلة #{item.order_id.slice(0, 8)}</Typography>
            <Typography variant="caption" color="secondary">
              {new Date(item.created_at).toLocaleTimeString("ar-DZ")}
            </Typography>
          </View>
          <Badge
            label={getStatusLabel(item.status)}
            variant={getStatusBadgeVariant(item.status)}
          />
        </View>

        {/* Store Section */}
        <View style={[styles.infoSection, { borderLeftColor: colors.primary }]}>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Store size={16} color={colors.textSecondary} />
            <Typography variant="body" style={{ fontWeight: "600" }}>{item.store_name}</Typography>
          </View>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <MapPin size={16} color={colors.textSecondary} />
            <Typography variant="caption" color="secondary">{item.store_address || "عين صفراء"}</Typography>
          </View>
          <View style={styles.contactRow}>
            <TouchableOpacity onPress={() => handleStartChat(item.merchant_id, "merchant_courier", item.order_id)}>
              <MessageCircle size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCall(item.order_id, item.merchant_id, 'merchant')}>
              <Phone size={20} color={colors.success} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Section */}
        <View style={[styles.infoSection, { borderLeftColor: colors.success }]}>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <User size={16} color={colors.textSecondary} />
            <Typography variant="body" style={{ fontWeight: "600" }}>{item.customer_name}</Typography>
          </View>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <MapPin size={16} color={colors.textSecondary} />
            <Typography variant="caption" color="secondary">{item.address_text}</Typography>
          </View>
          <View style={styles.contactRow}>
            <TouchableOpacity onPress={() => handleStartChat(item.customer_id, "customer_courier", item.order_id)}>
              <MessageCircle size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCall(item.order_id, item.customer_id, 'customer')}>
              <Phone size={20} color={colors.success} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Items Section */}
        {items.length > 0 && (
          <View style={styles.itemsSection}>
            <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row", marginBottom: 8 }]}>
              <ShoppingBag size={16} color={colors.textSecondary} />
              <Typography variant="caption" style={{ fontWeight: '700' }}>محتويات الطلب ({items.length})</Typography>
            </View>
            {items.map((sub: any) => (
              <View key={sub.id} style={[styles.itemRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="caption" style={{ flex: 1 }}>{sub.product?.name || 'سلعة'} × {sub.quantity}</Typography>
                <Price amount={sub.line_total_minor || 0} size="xs" color="secondary" />
              </View>
            ))}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Pricing Section */}
        <View style={[styles.pricingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View>
            <Typography variant="caption" color="secondary">رسوم التوصيل</Typography>
            <Price amount={deliveryFee} size="sm" color="primary" />
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Typography variant="caption" color="secondary">الإجمالي</Typography>
            <Price amount={total} size="md" color="text" />
          </View>
        </View>

        <Button
          style={{ marginTop: 12 }}
          variant="primary"
          title="عرض التفاصيل الكاملة"
          onPress={() => router.push(`/driver/deliveries?orderId=${item.order_id}`)}
        />
      </Card>
    );
  };

  if ((loading || authLoading) && activeDeliveries.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Header title="توصيلاتي التجارية" leftContent={null} />

      <FlatList
        data={activeDeliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshDeliveries} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            type="no-orders"
            title="لا توجد توصيلات نشطة"
            description="الطلبات المسندة إليك ستظهر هنا مع كامل التفاصيل التجارية."
            onAction={refreshDeliveries}
            actionTitle="تحديث"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  deliveryCard: {
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  headerRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: TOKENS.spacing.md,
  },
  orderIdCol: {
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  infoSection: {
    borderLeftWidth: 3,
    paddingLeft: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
    position: 'relative',
  },
  infoRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  itemsSection: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemRow: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.md,
  },
  pricingRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});
