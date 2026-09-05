
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { Card } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ subtotal, deliveryFee, total }) => {
  const { colors } = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>💰 سعر المنتجات</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{`${(subtotal / 100).toFixed(2)} د.ج`}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>🛵 رسوم التوصيل</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{`${(deliveryFee / 100).toFixed(2)} د.ج`}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
      <View style={styles.row}>
        <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>💵 الإجمالي</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{`${(total / 100).toFixed(2)} د.ج`}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: 'bold',
  },
  totalValue: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default OrderSummary;
