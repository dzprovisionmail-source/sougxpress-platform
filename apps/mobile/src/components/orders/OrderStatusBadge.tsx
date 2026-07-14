
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { OrderStatus } from '@/types/schema-03-core';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusMap: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'جديد', color: colors.primary, bgColor: colors.primary + '20' },
  accepted: { label: 'مقبول', color: colors.success, bgColor: colors.success + '20' },
  preparing: { label: 'قيد التحضير', color: colors.accent, bgColor: colors.accent + '20' },
  ready_for_pickup: { label: 'جاهز للاستلام', color: colors.success, bgColor: colors.success + '20' },
  picked_up: { label: 'تم الاستلام', color: colors.textSecondary, bgColor: colors.divider },
  delivered: { label: 'تم التوصيل', color: colors.success, bgColor: colors.success + '20' },
  cancelled: { label: 'مرفوض', color: colors.error, bgColor: colors.error + '20' },
  disputed: { label: 'نزاع', color: colors.error, bgColor: colors.error + '20' },
};

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const config = statusMap[status] || statusMap.pending;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.small,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.caption,
    fontWeight: 'bold',
  },
});

export default OrderStatusBadge;
