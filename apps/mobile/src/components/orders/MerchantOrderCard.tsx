import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  User, MapPin, ShoppingCart, MessageSquare,
  PlayCircle, PackageCheck, XCircle,
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

interface MerchantOrderCardProps {
  order: any;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({ order, onUpdateStatus }) => {
  const isNew       = order.status === 'pending';
  const isAccepted  = order.status === 'accepted';
  const isPreparing = order.status === 'preparing';
  const isReady     = order.status === 'ready_for_pickup';
  const canCancel   = isAccepted || isPreparing;

  return (
    <Card style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <OrderStatusBadge status={order.status} />
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>🧾 {order.id.slice(0, 8)}</Text>
          <Text style={styles.timestamp}>{new Date(order.created_at).toLocaleTimeString('ar-DZ')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Info ── */}
      <View style={styles.infoRow}>
        <User size={iconSizes.small} color={colors.textSecondary} />
        <Text style={styles.infoText}>{order.customer?.full_name || 'زبون'}</Text>
      </View>
      <View style={styles.infoRow}>
        <MapPin size={iconSizes.small} color={colors.textSecondary} />
        <Text style={styles.infoText}>{order.address?.address_text || 'العنوان غير متوفر'}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <ShoppingCart size={iconSizes.small} color={colors.textSecondary} />
        <Text style={styles.infoText}>قيمة الطلب: {(order.total_minor / 100).toFixed(2)} د.ج</Text>
      </View>

      {/* Items summary */}
      {Array.isArray(order.items) && order.items.length > 0 && (
        <View style={styles.itemsList}>
          {order.items.slice(0, 3).map((item: any, idx: number) => (
            <Text key={idx} style={styles.itemText}>
              • {item.product?.name ?? 'منتج'} × {item.quantity}
            </Text>
          ))}
          {order.items.length > 3 && (
            <Text style={styles.itemText}>+ {order.items.length - 3} منتجات أخرى</Text>
          )}
        </View>
      )}

      {order.notes && (
        <View style={styles.notesContainer}>
          <MessageSquare size={iconSizes.small} color={colors.primary} />
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* ── Actions ── */}
      <View style={styles.actionsContainer}>
        {/* Pending: accept or reject */}
        {isNew && (
          <>
            <Button
              title="✅ قبول"
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
              title="بدء التحضير"
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
          <View style={[styles.readyBanner, { backgroundColor: colors.success + '22' }]}>
            <PackageCheck size={iconSizes.small} color={colors.success} />
            <Text style={[styles.readyText, { color: colors.success }]}>
              في انتظار السائق لاستلام الطلب
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginVertical: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderIdContainer: { alignItems: 'flex-end' },
  orderId: { ...typography.subtitle, color: colors.text, fontWeight: 'bold' },
  timestamp: { ...typography.caption, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: spacing.xs },
  infoText: { ...typography.body, color: colors.text, marginRight: spacing.sm },
  itemsList: { backgroundColor: colors.backgroundLight, borderRadius: radius.small, padding: spacing.sm, marginBottom: spacing.sm },
  itemText: { ...typography.caption, color: colors.text, textAlign: 'right', marginBottom: 2 },
  notesContainer: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: colors.backgroundLight,
    padding: spacing.sm, borderRadius: radius.small, marginTop: spacing.sm },
  notesText: { ...typography.caption, color: colors.text, marginRight: spacing.sm, flex: 1, textAlign: 'right' },
  actionsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: 100 },
  preparingContainer: { width: '100%', flexDirection: 'column', gap: spacing.sm },
  preparingActions: { flexDirection: 'row-reverse', gap: spacing.sm },
  readyBanner: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: radius.small, width: '100%', justifyContent: 'center' },
  readyText: { ...typography.caption, fontWeight: '600' },
});

export default MerchantOrderCard;
