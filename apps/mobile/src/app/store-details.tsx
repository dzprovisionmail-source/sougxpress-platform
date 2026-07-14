import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ShoppingCart, Phone, MessageCircle, Share2 } from 'lucide-react-native';

import StoreHeader from '@/components/profile/StoreHeader';
import { ProductCard, Card, Button } from '@/components/ui';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';
import { shadows } from '@/design/shadows';

import useStore from '@/hooks/useStore';
import { useStoreProducts } from '@/hooks/useProducts';
import useCart from '@/hooks/useCart';
import { Product } from '@/types/schema-03-core';

const StoreDetailsScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const storeId = typeof id === 'string' ? id : undefined;

  const { store, loading: storeLoading, error: storeError } = useStore(storeId || '');
  const { products, loading: productsLoading, error: productsError } = useStoreProducts(storeId || '');
  const { addToCart, itemCount } = useCart();

  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product-details?id=${productId}`);
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => (product as any).category === selectedCategory);

  const productCategories = ['All', ...new Set(products.map(product => (product as any).category || 'Other'))];

  if (!storeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>ID du magasin manquant.</Text>
      </View>
    );
  }

  if (storeLoading || productsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du magasin...</Text>
      </View>
    );
  }

  if (storeError || productsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Erreur: {storeError || productsError}</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Magasin introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen
        options={{
          title: store.name,
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
        <StoreHeader
          storeName={store.name}
          category={store.category}
          rating={4.5}
          isOpen={store.status === 'active'}
          storeLogoUrl={null}
          coverImageUrl={null}
          isMerchantView={false}
        />

        <Card style={styles.storeInfoCard}>
          <Text style={styles.storeDescription}>
            {store.description || 'لا يوجد وصف متاح لهذا المتجر.'}
          </Text>
          <View style={styles.contactButtons}>
            <Button
              title="اتصل بالمتجر"
              onPress={() => { /* Handle call */ }}
              icon={<Phone size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
            <Button
              title="مراسلة واتساب"
              onPress={() => { /* Handle WhatsApp */ }}
              icon={<MessageCircle size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
            <Button
              title="مشاركة المتجر"
              onPress={() => { /* Handle Share */ }}
              icon={<Share2 size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
          </View>
        </Card>

        {/* Product Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>فئات المنتجات</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {productCategories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category && styles.selectedCategoryItem,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المنتجات</Text>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                title={product.name}
                price={`${(product.price_minor / 100).toFixed(2)} د.ج`}
                image={product.image_url || ''}
                storeName={store.name}
                onPress={() => handleProductPress(product.id)}
              />
            ))
          ) : (
            <Text style={styles.noResultsText}>لا توجد منتجات في هذه الفئة.</Text>
          )}
        </View>
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
  storeInfoCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  storeDescription: {
    ...typography.body,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  contactButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  contactButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  section: {
    marginBottom: spacing.huge,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row-reverse',
  },
  categoryItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.small,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    ...shadows.small,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    ...typography.subtitle,
    color: colors.text,
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
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
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default StoreDetailsScreen;
