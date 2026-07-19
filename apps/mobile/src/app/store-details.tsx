import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, I18nManager, Share } from 'react-native';
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

  const handleCall = () => {
    if (store?.phone_number) {
      Linking.openURL(`tel:${store.phone_number}`).catch(() => {
        Alert.alert("خطأ", "تعذر فتح تطبيق الهاتف.");
      });
    } else {
      Alert.alert("معلومات", "رقم الهاتف غير متوفر حالياً.");
    }
  };

  const handleWhatsApp = () => {
    const phone = store?.phone_number || "";
    if (!phone) {
      Alert.alert("معلومات", "رقم الهاتف غير متوفر حالياً.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    Linking.openURL(`whatsapp://send?phone=+213${cleanPhone.startsWith("0") ? cleanPhone.substring(1) : cleanPhone}`).catch(() => {
      Alert.alert("خطأ", "تعذر فتح واتساب.");
    });
  };

  const handleShare = async () => {
    if (!store) return;
    try {
      await Share.share({
        message: `تفقد متجر ${store.name} على سوق إكسبريس!`,
        url: `https://sougxpress.dz/store/${store.id}`,
      });
    } catch {
      // share cancelled
    }
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => (product as any).category === selectedCategory);

  const productCategories = ['All', ...new Set(products.map(product => (product as any).category || 'Other'))];

  if (!storeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>معرّف المتجر غير متوفر</Text>
      </View>
    );
  }

  if (storeLoading || productsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل المتجر...</Text>
      </View>
    );
  }

  if (storeError || productsError || !store) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>تعذّر تحميل المتجر</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.retryText}>العودة</Text>
        </TouchableOpacity>
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
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
          <Text style={[styles.storeDescription, { color: colors.text }]}>
            {store.description || 'لا يوجد وصف متاح لهذا المتجر.'}
          </Text>
          <View style={styles.contactButtons}>
            <Button
              title="اتصل بالمتجر"
              onPress={handleCall}
              icon={<Phone size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
            <Button
              title="مراسلة واتساب"
              onPress={handleWhatsApp}
              icon={<MessageCircle size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
            <Button
              title="مشاركة المتجر"
              onPress={handleShare}
              icon={<Share2 size={iconSizes.small} color="#FFFFFF" />}
              style={styles.contactButton}
            />
          </View>
        </Card>

        {/* Product Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>فئات المنتجات</Text>
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
                    { color: selectedCategory === category ? "#FFFFFF" : colors.text }
                  ]}
                >
                  {category === 'All' ? 'الكل' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>المنتجات</Text>
          <View style={styles.productsGrid}>
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
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>لا توجد منتجات حالياً</Text>
            )}
          </View>
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
    textAlign: 'center',
  },
  retryText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  storeInfoCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  storeDescription: {
    ...typography.body,
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
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  productsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    textAlign: 'center',
    width: '100%',
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
