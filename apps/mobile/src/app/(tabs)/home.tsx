import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, Store as StoreIcon, Tag, MapPin, Star } from 'lucide-react-native';

import { Input, Card, Header, StoreCard } from '@/design/components';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';

import { useStores, useSearch } from '@/hooks/useStores';
import useCart from '@/hooks/useCart';

const HomeScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { stores: allStores, loading: storesLoading, error: storesError } = useStores();
  const { results: searchResults, loading: searchLoading, handleSearch } = useSearch();
  const { itemCount } = useCart();

  const categories = [
    { name: 'مطاعم', icon: <StoreIcon color={colors.primary} size={iconSizes.default} /> },
    { name: 'بقالة', icon: <ShoppingCart color={colors.primary} size={iconSizes.default} /> },
    { name: 'عروض', icon: <Tag color={colors.primary} size={iconSizes.default} /> },
    { name: 'قريب مني', icon: <MapPin color={colors.primary} size={iconSizes.default} /> },
    { name: 'الأكثر تقييماً', icon: <Star color={colors.primary} size={iconSizes.default} /> },
  ];

  const handleStorePress = (storeId: string) => {
    router.push(`/store-details?id=${storeId}`);
  };

  const displayedStores = searchQuery.length > 0 ? searchResults.stores : allStores;
  const loading = storesLoading || searchLoading;
  const error = storesError;

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen
        options={{
          title: 'Soug-XPRESS',
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
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="بحث عن متاجر أو منتجات..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            icon={<SearchIcon color={colors.textSecondary} size={iconSizes.default} />}
          />
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Erreur: {error}</Text>
          </View>
        )}

        {!loading && !error && (
          <>
            {searchQuery.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>نتائج البحث</Text>
                {displayedStores.length > 0 ? (
                  displayedStores.map((store) => (
                    <StoreCard key={store.id} store={store} onPress={handleStorePress} />
                  ))
                ) : (
                  <Text style={styles.noResultsText}>لا توجد نتائج للبحث.</Text>
                )}
              </View>
            ) : (
              <>
                {/* Categories */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>الفئات</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                    {categories.map((category, index) => (
                      <TouchableOpacity key={index} style={styles.categoryItem}>
                        {category.icon}
                        <Text style={styles.categoryText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Featured Stores */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>المتاجر المميزة</Text>
                  {displayedStores.slice(0, 3).map((store) => (
                    <StoreCard key={store.id} store={store} onPress={handleStorePress} />
                  ))}
                </View>

                {/* New Stores */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>متاجر جديدة</Text>
                  {displayedStores.slice(3, 6).map((store) => (
                    <StoreCard key={store.id} store={store} onPress={handleStorePress} />
                  ))}
                </View>

                {/* Nearby Stores (Placeholder) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>متاجر قريبة</Text>
                  {displayedStores.slice(6, 9).map((store) => (
                    <StoreCard key={store.id} store={store} onPress={handleStorePress} />
                  ))}
                </View>

                {/* Special Offers (Placeholder) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>عروض خاصة</Text>
                  {displayedStores.slice(9, 12).map((store) => (
                    <StoreCard key={store.id} store={store} onPress={handleStorePress} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
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
    padding: spacing.lg,
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
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.medium,
    borderBottomRightRadius: radius.medium,
    marginBottom: spacing.md,
    ...colors.shadows.small,
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
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.small,
    ...colors.shadows.small,
  },
  categoryText: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
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
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
