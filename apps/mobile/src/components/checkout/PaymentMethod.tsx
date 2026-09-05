import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Banknote } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { Card } from '@/components/ui';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';
import { useAppTheme } from '@/contexts/ThemeContext';

const PaymentMethod = () => {
  const { colors } = useAppTheme();
  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>طريقة الدفع</Text>
      <View style={[styles.content, { backgroundColor: colors.inputBackground }]}>
        <Banknote size={iconSizes.default} color={colors.success} style={styles.icon} />
        <View style={styles.info}>
          <Text style={[styles.methodName, { color: colors.textPrimary }]}>💵 الدفع عند الاستلام</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>يتم الدفع نقداً عند استلام الطلب.</Text>
        </View>
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
  title: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: radius.small,
  },
  icon: {
    marginLeft: spacing.md,
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
  },
  methodName: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});

export default PaymentMethod;
