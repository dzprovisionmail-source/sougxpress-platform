import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShoppingBag, Store, Bike, WalletCards } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { getMyCommercialStats, CommercialStats } from '@/services/merchant-orders.service';

type CommercialRole = 'customer' | 'merchant' | 'courier';

interface Props {
  role: CommercialRole;
}

export default function CommercialStatsStrip({ role }: Props) {
  const [stats, setStats] = useState<CommercialStats | null>(null);

  const load = useCallback(async () => {
    const next = await getMyCommercialStats();
    setStats(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats) return null;

  const items = role === 'customer'
    ? [
        { label: 'مشتريات مكتملة', value: stats.customer_purchases_completed, icon: ShoppingBag },
        { label: 'توصيلات مستلمة', value: stats.customer_deliveries_completed, icon: Bike },
      ]
    : role === 'merchant'
      ? [
          { label: 'طلبات مكتملة', value: stats.merchant_orders_completed, icon: Store },
          { label: 'مبيعات مكتملة', value: `${(stats.merchant_sales_completed_minor / 100).toFixed(0)} دج`, icon: WalletCards },
        ]
      : [
          { label: 'توصيلات مكتملة', value: stats.driver_deliveries_completed, icon: Bike },
          { label: 'عمولة المنصة 20%', value: `${(stats.driver_commission_owed_minor / 100).toFixed(0)} دج`, icon: WalletCards },
          { label: 'صافي التوصيل', value: `${(stats.driver_net_minor / 100).toFixed(0)} دج`, icon: ShoppingBag },
        ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {items.map(({ label, value, icon: Icon }) => (
        <View key={label} style={styles.card}>
          <Icon size={18} color={colors.primary} />
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    minWidth: 120,
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm,
    alignItems: 'flex-end',
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginTop: 3,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
});
