import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert, I18nManager } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ShoppingCart, Minus, Plus } from 'lucide-react-native';

import { Button, Card } from '@/components/ui';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';

import { useProductDetails } from '@/hooks/useProducts';
import useCart from '@/hooks/useCart';

const ProductDetailsScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const productId = typeof id === 'string' ? id : undefined;

  const { product, images, loading, error } = useProductDetails(productId || '');
  const { addToCart, itemCount } = useCart();

  const [quantity, setQuantity] = useState(1);
  const isRTL = I18nManager.isRTL;

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      Alert.alert('Produit ajouté', `${quantity} ${product.name} ajouté(s) au panier.`);
    }
  };

  if (!productId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>ID du produit manquant.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du produit...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Produit introuvable.</Text>
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
              <ShoppingCart color={colors.text} size={iconSizes.header} />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <Image source={{ uri: mainImage }} style={styles.productImage} />

        <Card style={styles.productDetailsCard}>
          <Text style={[styles.productName, { textAlign: isRTL ? 'right' : 'left' }]}>{product.name}</Text>
          <Text style={[styles.productPrice, { textAlign: isRTL ? 'right' : 'left' }]}>{`${(product.price_minor / 100).toFixed(2)} د.ج`}</Text>
          <Text style={[styles.productDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</Text>

          <View style={[styles.quantitySelectorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.quantityLabel, { textAlign: isRTL ? 'right' : 'left' }]}>الكمية:</Text>
            <View style={[styles.quantityControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setQuantity(prev => Math.max(1, prev - 1))} style={styles.quantityButton}>
                <Minus size={iconSizes.default} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(prev => prev + 1)} style={styles.quantityButton}>
                <Plus size={iconSizes.default} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="إضافة إلى السلة"
            onPress={handleAddToCart}
            variant="primary"
            icon={<ShoppingCart size={iconSizes.default} color={colors.white} />}
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
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.md,
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
    color: colors.text,
    marginBottom: spacing.sm,
  },
  productPrice: {
    ...typography.title,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  productDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  quantitySelectorContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  quantityLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  quantityControls: {
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  quantityButton: {
    padding: spacing.sm,
  },
  quantityText: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  addToCartButton: {
    width: '100%',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProductDetailsScreen;
