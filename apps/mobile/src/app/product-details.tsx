import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert, I18nManager } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ShoppingCart, Minus, Plus } from 'lucide-react-native';

import { Button, Card } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';

import { useProductDetails } from '@/hooks/useProducts';
import useCart from '@/hooks/useCart';

const ProductDetailsScreen = () => {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const productId = typeof id === 'string' ? id : undefined;

  const { product, images, loading, error } = useProductDetails(productId || '');
  const { addToCart, itemCount } = useCart();

  const [quantity, setQuantity] = useState(1);
  const isRTL = I18nManager.isRTL;

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      Alert.alert('تمت الإضافة', `تمت إضافة ${quantity} × ${product.name} إلى السلة.`);
    }
  };

  if (!productId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>معرّف المنتج غير متوفر</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري تحميل المنتج...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>خطأ: {error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={[styles.retryText, { color: colors.primary }]}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>المنتج غير متوفر</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={[styles.retryText, { color: colors.primary }]}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mainImage = images.length > 0 ? images[0].url : 'https://via.placeholder.com/300';

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen
        options={{
          title: product.name,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/cart')}>
              <ShoppingCart color={colors.textPrimary} size={iconSizes.header} />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={[styles.cartBadgeText, { color: colors.textOnBrand }]}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <Image source={{ uri: mainImage }} style={styles.productImage} />

        <Card style={styles.productDetailsCard}>
          <Text style={[styles.productName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{product.name}</Text>
          <Text style={[styles.productPrice, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>{`${(product.price_minor / 100).toFixed(2)} د.ج`}</Text>
          <Text style={[styles.productDescription, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</Text>

          <View style={[styles.quantitySelectorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.quantityLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>الكمية:</Text>
            <View style={[styles.quantityControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setQuantity(prev => Math.max(1, prev - 1))} style={styles.quantityButton}>
                <Minus size={iconSizes.default} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: colors.textPrimary }]}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(prev => prev + 1)} style={styles.quantityButton}>
                <Plus size={iconSizes.default} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="إضافة إلى السلة"
            onPress={handleAddToCart}
            variant="primary"
            icon={<ShoppingCart size={iconSizes.default} color={colors.textOnBrand} />}
            style={styles.addToCartButton}
          />
        </Card>
      </ScrollView>
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
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    marginBottom: spacing.md,
  },
  productDetailsCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  productName: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  productPrice: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  productDescription: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  quantitySelectorContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  quantityLabel: {
    ...typography.subtitle,
  },
  quantityControls: {
    alignItems: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
  },
  quantityButton: {
    padding: spacing.sm,
  },
  quantityText: {
    ...typography.body,
    paddingHorizontal: spacing.md,
  },
  addToCartButton: {
    width: '100%',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProductDetailsScreen;
