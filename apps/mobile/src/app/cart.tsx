import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShoppingCart, XCircle } from 'lucide-react-native';

import { Button, Card, CartItem } from '../../design/components';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { iconSizes } from '../../design/icons';

import useCart from '../../hooks/useCart';

const CartScreen = () => {
  const router = useRouter();
  const { cartItems, loading, removeFromCart, updateQuantity, subtotal, deliveryFee, total, clearCart } = useCart();

  const handleContinue = () => {
    router.push('/checkout');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du panier...</Text>
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
            <ShoppingCart size={iconSizes.huge} color={colors.textSecondary} style={styles.emptyCartIcon} />
            <Text style={styles.emptyCartText}>سلة التسوق فارغة.</Text>
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
                <Text style={styles.summaryLabel}>المجموع الفرعي:</Text>
                <Text style={styles.summaryValue}>{`${(subtotal / 100).toFixed(2)} د.ج`}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>رسوم التوصيل:</Text>
                <Text style={styles.summaryValue}>{`${(deliveryFee / 100).toFixed(2)} د.ج`}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>الإجمالي:</Text>
                <Text style={styles.totalValue}>{`${(total / 100).toFixed(2)} د.ج`}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
      {cartItems.length > 0 && (
        <View style={styles.bottomAction}>
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
    backgroundColor: colors.backgroundLight,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyCartIcon: {
    marginBottom: spacing.md,
  },
  emptyCartText: {
    ...typography.title,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  summaryValue: {
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
  },
  totalValue: {
    ...typography.subtitle,
    color: colors.primary,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...colors.shadows.small,
  },
  continueButton: {
    width: '100%',
  },
});

export default CartScreen;
