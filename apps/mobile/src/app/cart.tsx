import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShoppingCart, XCircle } from 'lucide-react-native';

import { Button, Card } from '@/components/ui';
import { CartItem } from '@/components/cart/CartItem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { shadows } from '@/design/shadows';

import useCart from '@/hooks/useCart';

const CartScreen = () => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { cartItems, loading, removeFromCart, updateQuantity, subtotal, deliveryFee, total, clearCart } = useCart();

  const handleContinue = () => {
    router.push('/checkout');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement du panier...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen
        options={{
          title: 'سلة التسوق',
          headerRight: () => (
            <TouchableOpacity onPress={() => clearCart()}>
              <XCircle color={colors.error} size={iconSizes.header} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {cartItems.length === 0 ? (
          <View style={styles.centered}>
            <ShoppingCart size={48} color={colors.textSecondary} style={styles.emptyCartIcon} />
            <Text style={[styles.emptyCartText, { color: colors.textSecondary }]}>سلة التسوق فارغة.</Text>
            <Button title="ابدأ التسوق" onPress={() => router.push('/home')} variant="primary" style={styles.emptyCartButton} />
          </View>
        ) : (
          <>
            {cartItems.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onRemove={removeFromCart}
                onUpdateQuantity={updateQuantity}
              />
            ))}

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>المجموع الفرعي:</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{`${(subtotal / 100).toFixed(2)} د.ج`}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>رسوم التوصيل:</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{`${(deliveryFee / 100).toFixed(2)} د.ج`}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>الإجمالي:</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{`${(total / 100).toFixed(2)} د.ج`}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
      {cartItems.length > 0 && (
        <View style={[styles.bottomAction, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
          <Button
            title="متابعة"
            onPress={handleContinue}
            variant="primary"
            style={styles.continueButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  emptyCartIcon: {
    marginBottom: spacing.md,
  },
  emptyCartText: {
    ...typography.title,
    marginBottom: spacing.lg,
  },
  emptyCartButton: {
    width: '60%',
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
  },
  summaryValue: {
    ...typography.body,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.subtitle,
  },
  totalValue: {
    ...typography.subtitle,
  },
  bottomAction: {
    padding: spacing.lg,
    borderTopWidth: 1,
    ...shadows.small,
  },
  continueButton: {
    width: '100%',
  },
});

export default CartScreen;
