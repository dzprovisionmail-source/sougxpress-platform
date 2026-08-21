import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import {
  User, MapPin, ShoppingCart, MessageSquare,
  PlayCircle, PackageCheck, XCircle, Clock, Heart, MessageCircle, Phone,
} from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { OrderStatus } from '@/types/schema-03-core';
import { Card, Button } from '@/components/ui';
import OrderStatusBadge from './OrderStatusBadge';
import PreparationTimer from './PreparationTimer';
import { toggleMerchantFavorite, getMerchantFavoriteCustomerIds } from '@/services/favorite.service';
import { useState, useEffect } from 'react';
import { getOrCreateConversation, getCommercialPhone, logCallPress } from '@/services/chat.service';
import { Linking, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CourierSelectionModal } from './CourierSelectionModal';

interface MerchantOrderCardProps {
  order: any;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({ order, onUpdateStatus }) => {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [calling, setCalling] = useState<string | null>(null); // 'customer' | 'courier'
  const [showCourierModal, setShowCourierModal] = useState(false);

  // Extract courier info from delivery assignments
  const assignment = order.delivery_assignments?.[0];
  const courier = assignment?.driver;

  useEffect(() => {
    if (order.customer?.id) {
      getMerchantFavoriteCustomerIds().then(ids => {
        setIsFavorite(ids.includes(order.customer.id));
      });
    }
  }, [order.customer?.id]);

  const handleToggleFavorite = async () => {
    if (!order.customer?.id) return;
    const { isFavorite: newStatus, error } = await toggleMerchantFavorite(order.customer.id);
    if (!error) {
      setIsFavorite(newStatus);
    }
  };

  const handleStartChat = async () => {
    if (!order.customer?.id) return;
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        order.customer.id,
        "customer_merchant",
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

  const handleStartCourierChat = async () => {
    const driverId = courier?.id;
    if (!driverId) return;
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        driverId,
        "merchant_courier",
        order.id
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting courier chat:", err);
    }
  };

  const handleAssignedCourier = async (driverId: string) => {
    onUpdateStatus(order.id, order.status);
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        driverId,
        "merchant_courier",
        order.id
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error opening courier order chat:", err);
      Alert.alert("تم الإسناد", "تم اختيار الموصل. يمكنك فتح المحادثة من الطلب لاحقاً.");
    }
  };

  const handleCall = async (targetRole: 'customer' | 'courier', receiverId: string) => {
    if (!order.id || !receiverId || calling) return;
    
    setCalling(targetRole);
    try {
      const { data: phone, error } = await getCommercialPhone(order.id, targetRole);
      
      if (error || !phone) {
        Alert.alert("تنبيه", "لا يمكن استرجاع رقم الهاتف في هذه المرحلة أو أن العلاقة التجارية غير نشطة.");
        return;
      }

      const relationshipType = targetRole === 'customer' ? 'customer_merchant' : 'merchant_courier';
      await logCallPress(order.id, receiverId, relationshipType);

      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.error("Error handling call:", err);
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة الاتصال.");
    } finally {
      setCalling(null);
    }
  };

  const isNew       = order.status === 'pending';
  const isAccepted  = order.status === 'accepted';
  const isPreparing = order.status === 'preparing';
  const isReady     = order.status === 'ready_for_pickup';

  const deliveryPhaseLabel = (() => {
    if (!assignment) return isReady ? 'بانتظار اختيار الموصل' : 'لم يتم إسناد التوصيل بعد';
    switch (assignment.status) {
      case 'pending':
        return courier ? 'في انتظار قبول الموصل' : 'العرض متاح للموصلين';
      case 'accepted':
        return 'الموصل قبل الطلب';
      case 'arrived_at_store':
        return 'الموصل وصل إلى المتجر';
      case 'picked_up':
        return 'تم استلام الطلب من المتجر';
      case 'out_for_delivery':
        return 'الطلب قيد التوصيل';
      case 'delivered':
        return 'تم تسليم الطلب';
      case 'cancelled':
      case 'failed':
        return 'تعذر إتمام التوصيل';
      default:
        return 'حالة التوصيل قيد المتابعة';
    }
  })();

  const subtotalMinor = Number(order.subtotal_minor ?? order.items?.reduce(
    (acc: number, item: any) => acc + Number(item.line_total_minor || (item.quantity * item.price_at_order_minor) || 0),
    0,
  ) ?? order.total_minor ?? 0);
  const deliveryFeeMinor = Number(order.delivery_fee_minor || 0) > 0
    ? Number(order.delivery_fee_minor)
    : 20000; // Standard 200 DZD fee
  const totalMinor = Number(order.total_minor || 0) >= subtotalMinor + deliveryFeeMinor
    ? Number(order.total_minor)
    : subtotalMinor + deliveryFeeMinor;
  const customerName = order.customer?.full_name?.trim()
    || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ').trim()
    || 'زبون غير مسجل';
  const courierName = courier?.full_name?.trim()
    || [courier?.first_name, courier?.last_name].filter(Boolean).join(' ').trim()
    || 'الموصل';
  const addressText = order.address?.address_text?.trim()
    || [order.address?.address_line1, order.address?.address_line2, order.address?.city]
      .filter(Boolean)
      .join('، ')
    || 'العنوان غير متوفر';

  return (
    <Card style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <OrderStatusBadge status={order.status} />
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            <Text style={styles.timestamp}>{new Date(order.created_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Customer & Address Info ── */}
      <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
          <User size={iconSizes.small} color={colors.textSecondary} />
          <Text style={styles.infoText}>الزبون: {customerName}</Text>
        </View>
        {order.customer?.id && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => handleCall('customer', order.customer.id)} 
              style={{ padding: 4 }}
              disabled={calling === 'customer'}
            >
              {calling === 'customer' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Phone size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStartChat} style={{ padding: 4 }}>
              <MessageCircle size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleFavorite} style={{ padding: 4 }}>
              <Heart size={20} color={isFavorite ? colors.error : colors.textSecondary} fill={isFavorite ? colors.error : 'transparent'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Courier Info (Merchant-Courier Chat) ── */}
      {courier && (
        <View style={[styles.infoRow, { justifyContent: 'space-between', marginTop: spacing.xs }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
            <Clock size={iconSizes.small} color={colors.textSecondary} />
            <Text style={styles.infoText}>الموصل: {courierName}</Text>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => handleCall('courier', courier.id)} 
              style={{ padding: 4 }}
              disabled={calling === 'courier'}
            >
              {calling === 'courier' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Phone size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStartCourierChat} style={{ padding: 4 }}>
              <MessageSquare size={20} color={colors.accent || colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={styles.infoRow}>
        <MapPin size={iconSizes.small} color={colors.textSecondary} />
        <Text style={styles.infoText}>العنوان: {addressText}</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Items Detailed List ── */}
      <Text style={styles.sectionTitle}>محتويات السلة:</Text>
      {Array.isArray(order.items) && order.items.length > 0 ? (
        <View style={styles.itemsContainer}>
          {order.items.map((item: any, idx: number) => {
            const unitPriceDzd = (item.price_at_order_minor / 100).toFixed(2);
            const lineTotalDzd = ((item.line_total_minor || (item.quantity * item.price_at_order_minor)) / 100).toFixed(2);
            return (
              <View key={idx} style={styles.itemRow}>
                {item.product?.image_url ? (
                  <Image source={{ uri: item.product.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}><ShoppingCart size={14} color={colors.textSecondary} /></View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.product?.name ?? 'منتج'}</Text>
                  <Text style={styles.itemSubtext}>الكمية: ×{item.quantity} | السعر: {unitPriceDzd} د.ج</Text>
                </View>
                <Text style={styles.itemTotal}>{lineTotalDzd} د.ج</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noItemsText}>لا توجد تفاصيل للمنتجات</Text>
      )}

      {order.special_instructions && (
        <View style={styles.notesContainer}>
          <MessageSquare size={iconSizes.small} color={colors.primary} />
          <Text style={styles.notesText}>ملاحظات: {order.special_instructions}</Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* ── Pricing Summary ── */}
      <View style={styles.priceSummary}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>مجموع المنتجات:</Text>
          <Text style={styles.priceVal}>{(subtotalMinor / 100).toFixed(2)} د.ج</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>رسوم التوصيل:</Text>
          <Text style={styles.priceVal}>{(deliveryFeeMinor / 100).toFixed(2)} د.ج</Text>
        </View>
        <View style={[styles.priceRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>الإجمالي النهائي:</Text>
          <Text style={styles.grandTotalVal}>{(totalMinor / 100).toFixed(2)} د.ج</Text>
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsContainer}>
        {/* Pending: accept or reject/cancel */}
        {isNew && (
          <>
            <Button
              title="✅ قبول الطلب"
              onPress={() => onUpdateStatus(order.id, 'accepted')}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title="❌ رفض"
              onPress={() => onUpdateStatus(order.id, 'cancelled')}
              variant="danger"
              style={styles.actionButton}
            />
          </>
        )}

        {/* Accepted: start preparing (+ cancel) */}
        {isAccepted && (
          <>
            <Button
              title="🚀 بدء التحضير"
              onPress={() => onUpdateStatus(order.id, 'preparing')}
              variant="primary"
              icon={<PlayCircle size={iconSizes.small} color={colors.white} />}
              style={styles.actionButton}
            />
            <Button
              title="إلغاء"
              onPress={() => onUpdateStatus(order.id, 'cancelled')}
              variant="danger"
              icon={<XCircle size={iconSizes.small} color={colors.white} />}
              style={styles.actionButton}
            />
          </>
        )}

        {/* Preparing: mark ready (+ cancel) */}
        {isPreparing && (
          <View style={styles.preparingContainer}>
            <PreparationTimer startTime={order.updated_at} />
            <View style={styles.preparingActions}>
              <Button
                title="📦 جاهز للاستلام"
                onPress={() => onUpdateStatus(order.id, 'ready_for_pickup')}
                variant="primary"
                icon={<PackageCheck size={iconSizes.small} color={colors.white} />}
                style={styles.actionButton}
              />
              <Button
                title="إلغاء"
                onPress={() => onUpdateStatus(order.id, 'cancelled')}
                variant="danger"
                icon={<XCircle size={iconSizes.small} color={colors.white} />}
                style={styles.actionButton}
              />
            </View>
          </View>
        )}

        {/* Ready: waiting for driver — info only */}
        {isReady && (
          <View style={styles.readyActionsContainer}>
            <View style={[styles.readyBanner, { backgroundColor: colors.success + '22' }]}>
              <PackageCheck size={iconSizes.small} color={colors.success} />
              <View style={styles.readyBannerText}>
                <Text style={[styles.readyText, { color: colors.success }]}>
                  {courier ? 'تم تعيين الموصل' : 'الطلب جاهز للتوصيل'}
                </Text>
                <Text style={styles.deliveryPhaseText}>{deliveryPhaseLabel}</Text>
              </View>
            </View>
            {!courier && (
              <Button
                title="اختيار موصل للطلب"
                onPress={() => setShowCourierModal(true)}
                variant="outline"
                size="sm"
                style={styles.assignButton}
              />
            )}
          </View>
        )}
      </View>

      <CourierSelectionModal
        visible={showCourierModal}
        onClose={() => setShowCourierModal(false)}
        orderId={order.id}
        onAssigned={handleAssignedCourier}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginVertical: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderIdContainer: { alignItems: 'flex-end' },
  orderId: { ...typography.subtitle, color: colors.text, fontWeight: 'bold' },
  timeRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 2 },
  timestamp: { ...typography.caption, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: spacing.xs },
  infoText: { ...typography.body, color: colors.text, marginRight: spacing.sm, textAlign: 'right' },
  sectionTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700', textAlign: 'right', marginBottom: spacing.xs },
  itemsContainer: { backgroundColor: colors.backgroundLight, borderRadius: radius.small, padding: spacing.sm, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemImage: { width: 36, height: 36, borderRadius: radius.small, marginLeft: spacing.sm },
  placeholderImage: { backgroundColor: colors.divider, justifyContent: 'center', alignItems: 'center' },
  itemDetails: { flex: 1, alignItems: 'flex-end' },
  itemName: { ...typography.body, fontWeight: '600', color: colors.text, textAlign: 'right' },
  itemSubtext: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  itemTotal: { ...typography.body, fontWeight: 'bold', color: colors.primary },
  noItemsText: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginBottom: spacing.sm },
  notesContainer: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: colors.backgroundLight,
    padding: spacing.sm, borderRadius: radius.small, marginTop: spacing.sm },
  notesText: { ...typography.caption, color: colors.text, marginRight: spacing.sm, flex: 1, textAlign: 'right' },
  priceSummary: { backgroundColor: colors.backgroundLight, padding: spacing.sm, borderRadius: radius.small, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  priceLabel: { ...typography.caption, color: colors.textSecondary },
  priceVal: { ...typography.caption, color: colors.text, fontWeight: '600' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 4, marginTop: 4 },
  grandTotalLabel: { ...typography.body, fontWeight: 'bold', color: colors.text },
  grandTotalVal: { ...typography.body, fontWeight: 'bold', color: colors.primary },
  actionsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: 100 },
  preparingContainer: { width: '100%', flexDirection: 'column', gap: spacing.sm },
  preparingActions: { flexDirection: 'row-reverse', gap: spacing.sm },
  readyActionsContainer: { width: '100%', gap: spacing.sm },
  readyBanner: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: radius.small, width: '100%', justifyContent: 'center' },
  readyBannerText: { flex: 1, alignItems: 'flex-end' },
  readyText: { ...typography.caption, fontWeight: '700', textAlign: 'right' },
  deliveryPhaseText: { ...typography.caption, color: colors.textSecondary, marginTop: 2, textAlign: 'right' },
  assignButton: { width: '100%', minWidth: 0, height: 44 },
});

export default MerchantOrderCard;
