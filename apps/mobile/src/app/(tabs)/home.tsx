import CouriersHorizontalBar from "@/components/courier/CouriersHorizontalBar";
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, Store as StoreIcon, Tag, MapPin, Star } from 'lucide-react-native';

import { Input, StoreCard, CategoryIcon } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';
import { shadows } from '@/design/shadows';

import { useStores, useSearch } from '@/hooks/useStores';
import useCart from '@/hooks/useCart';
import { getActiveCategories } from '@/services/category.service';
import { getArabicCategoryName } from '@/config/storeCategories';

const HomeScreen = () => {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string; icon?: string }>>([]);
  const { stores: allStores, loading: storesLoading, error: storesError } = useStores();
  const { results: searchResults, loading: searchLoading, handleSearch } = useSearch();
  const { itemCount } = useCart();

  useEffect(() => {
    getActiveCategories().then(setCategories);
  }, []);

  const handleStorePress = (storeId: string) => {
    router.push(`/store-details?id=${storeId}`);
  };

  const displayedStores = searchQuery.length > 0 ? searchResults.stores : allStores;
  const loading = storesLoading || searchLoading;
  const error = storesError;

  const filteredByCategory = activeCategory === "all" ? displayedStores : displayedStores.filter((s: any) => s.category_id === activeCategory || s.main_category === activeCategory || s.category === activeCategory);

  return (
    <SafeAreaView style={[styles.fullContainer, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen
        options={{
          title: 'Soug-XPRESS',
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
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.bgSurface }]}>
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري التحميل...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{String(error)}</Text>
          </View>
        )}

        {!loading && !error && (
          <>
            {searchQuery.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>نتائج البحث</Text>
                {displayedStores.length > 0 ? (
                  displayedStores.map((store) => (
                    <StoreCard
                      key={store.id}
                      id={store.id}
                      name={store.name}
                      category={store.category}
                      rating="4.5"
                      coverImage={store.cover_url}
                      isOpen={store.is_open}
                      isFeatured={(store as any).is_featured}
                      address={(store as any).address_line1 ?? (store as any).city ?? ""}
                      onPress={() => handleStorePress(store.id)}
                    />
                  ))
                ) : (
                  <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>لا توجد نتائج للبحث.</Text>
                )}
              </View>
              ) : (
                <>
                  {/* Couriers Horizontal Bar */}
                  <CouriersHorizontalBar />

                  {/* Categories */}
                  <View style={styles.section}>
                   <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>الفئات</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                     <TouchableOpacity key="all" onPress={() => setActiveCategory("all")} style={[styles.categoryItem, { backgroundColor: activeCategory === "all" ? colors.primary + "18" : colors.bgSurface }]}>
                       <StoreIcon color={activeCategory === "all" ? colors.primary : colors.textSecondary} size={iconSizes.default} />
                       <Text style={[styles.categoryText, { color: activeCategory === "all" ? colors.primary : colors.textPrimary }]}>الكل</Text>
                     </TouchableOpacity>
                     {categories.map((category) => (
                       <TouchableOpacity key={category.id} onPress={() => setActiveCategory(category.id)} style={[styles.categoryItem, { backgroundColor: activeCategory === category.id ? colors.primary + "18" : colors.bgSurface }]}>
                         <CategoryIcon category={category.name_ar} size="sm" variant={activeCategory === category.id ? "filled" : "subtle"} />
                         <Text style={[styles.categoryText, { color: activeCategory === category.id ? colors.primary : colors.textPrimary }]}>{category.name_ar}</Text>
                       </TouchableOpacity>
                     ))}
                   </ScrollView>
                 </View>

                 {/* Featured Stores */}
                 <View style={styles.section}>
                   <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>المتاجر المميزة</Text>
                   {filteredByCategory.slice(0, 3).map((store: any) => (
                     <StoreCard
                       key={store.id}
                       id={store.id}
                       name={store.name}
                       category={getArabicCategoryName(store.main_category || store.category)}
                       subcategory={store.sub_category}
                       rating="4.5"
                       coverImage={store.cover_url}
                       isOpen={store.is_open}
                       isFeatured={store.is_featured}
                       address={(store as any).address_line1 ?? (store as any).city ?? ""}
                       onPress={() => handleStorePress(store.id)}
                     />
                   ))}
                 </View>

                 {/* New Stores */}
                 <View style={styles.section}>
                   <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>متاجر جديدة</Text>
                   {filteredByCategory.slice(3, 6).map((store: any) => (
                     <StoreCard
                       key={store.id}
                       id={store.id}
                       name={store.name}
                       category={getArabicCategoryName(store.main_category || store.category)}
                       subcategory={store.sub_category}
                       rating="4.5"
                       coverImage={store.cover_url}
                       isOpen={store.is_open}
                       isFeatured={store.is_featured}
                       address={(store as any).address_line1 ?? (store as any).city ?? ""}
                       onPress={() => handleStorePress(store.id)}
                     />
                   ))}
                 </View>

                 {/* Nearby Stores (Placeholder) */}
                 <View style={styles.section}>
                   <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>متاجر قريبة</Text>
                   {filteredByCategory.slice(6, 9).map((store: any) => (
                     <StoreCard
                       key={store.id}
                       id={store.id}
                       name={store.name}
                       category={getArabicCategoryName(store.main_category || store.category)}
                       subcategory={store.sub_category}
                       rating="4.5"
                       coverImage={store.cover_url}
                       isOpen={store.is_open}
                       isFeatured={store.is_featured}
                       address={(store as any).address_line1 ?? (store as any).city ?? ""}
                       onPress={() => handleStorePress(store.id)}
                     />
                   ))}
                 </View>

                 {/* Special Offers (Placeholder) */}
                 <View style={styles.section}>
                   <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>عروض خاصة</Text>
                   {filteredByCategory.slice(9, 12).map((store: any) => (
                     <StoreCard
                       key={store.id}
                       id={store.id}
                       name={store.name}
                       category={getArabicCategoryName(store.main_category || store.category)}
                       subcategory={store.sub_category}
                       rating="4.5"
                       coverImage={store.cover_url}
                       isOpen={store.is_open}
                       isFeatured={store.is_featured}
                       address={(store as any).address_line1 ?? (store as any).city ?? ""}
                       onPress={() => handleStorePress(store.id)}
                     />
                   ))}
                 </View>
               </>
             )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  errorText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomLeftRadius: radius.medium,
    borderBottomRightRadius: radius.medium,
    marginBottom: spacing.md,
    ...shadows.small,
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
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.small,
    ...shadows.small,
  },
  categoryText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  noResultsText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
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

export default HomeScreen;
