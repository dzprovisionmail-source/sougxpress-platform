import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  User, MapPin, ShoppingCart, MessageSquare, 
  PlayCircle, PackageCheck 
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
  const isNew = order.status === 'pending';
  const isAccepted = order.status === 'accepted';
  const isPreparing = order.status === 'preparing';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <OrderStatusBadge status={order.status} />
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>🧾 {order.id.slice(0, 8)}</Text>
          <Text style={styles.timestamp}>{new Date(order.created_at).toLocaleTimeString('ar-DZ')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

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

      {order.notes && (
        <View style={styles.notesContainer}>
          <MessageSquare size={iconSizes.small} color={colors.primary} />
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {isNew && (
          <>
            <Button 
              title="✅ قبول الطلب" 
              onPress={() => onUpdateStatus(order.id, 'accepted')} 
              variant="primary" 
              style={styles.actionButton}
            />
            <Button 
              title="❌ رفض الطلب" 
              onPress={() => onUpdateStatus(order.id, 'cancelled')} 
              variant="danger" 
              style={styles.actionButton}
            />
          </>
        )}

        {isAccepted && (
          <Button 
            title="بدء التحضير" 
            onPress={() => onUpdateStatus(order.id, 'preparing')} 
            variant="primary" 
            icon={<PlayCircle size={iconSizes.small} color={colors.white} />}
            style={styles.fullActionButton}
          />
        )}

        {isPreparing && (
          <View style={styles.preparingContainer}>
            <PreparationTimer startTime={order.updated_at} />
            <Button 
              title="📦 جاهز للاستلام" 
              onPress={() => onUpdateStatus(order.id, 'ready_for_pickup')} 
              variant="primary" 
              icon={<PackageCheck size={iconSizes.small} color={colors.white} />}
              style={styles.preparingButton}
            />
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderIdContainer: {
    alignItems: 'flex-end',
  },
  orderId: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: 'bold',
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
  },
  notesContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundLight,
    padding: spacing.sm,
    borderRadius: radius.small,
    marginTop: spacing.sm,
  },
  notesText: {
    ...typography.caption,
    color: colors.text,
    marginRight: spacing.sm,
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  fullActionButton: {
    width: '100%',
  },
  preparingContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  preparingButton: {
    width: '100%',
  },
});

export default MerchantOrderCard;
