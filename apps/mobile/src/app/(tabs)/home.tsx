import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Image, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, Store as StoreIcon, Tag, MapPin, Star, Bike, LogIn } from 'lucide-react-native';

import { Input, StoreCard, CategoryIcon, Typography, ProductCard, Button } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';
import { shadows } from '@/design/shadows';

import { useStores, useSearch } from '@/hooks/useStores';
import useCart from '@/hooks/useCart';
import { getActiveCategories, getActiveSubcategories } from '@/services/category.service';
import { getArabicCategoryName } from '@/config/storeCategories';
import { getAvailableCouriers, vehicleLabel } from '@/services/courierService';
import { getActiveHeroSlides } from '@/services/heroSlider.service';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
  kind?: "alert" | "promotion" | "flash" | "store" | "product" | "courier";
}

const HERO_SLIDES_TEMPLATES: Omit<HeroSlide, "storeId" | "storeName">[] = [
  {
    id: "1",
    image: "",
    title: "عروض الأسبوع",
    description: "خصومات حصرية على الخضروات والفواكه الطازجة",
    buttonLabel: "تسوق الآن",
  },
  {
    id: "2",
    image: "",
    title: "متجر جديد في السوق",
    description: "مخبزة السعادة تفتح أبوابها — خبز طازج يومياً",
    buttonLabel: "اكتشف المتجر",
  },
  {
    id: "3",
    image: "",
    title: "توصيل مجاني",
    description: "لأول طلب لك — يوصلك لبابك بدون رسوم",
    buttonLabel: "اطلب الآن",
  },
];

const HERO_STORE_TITLES = ["سوبر ماركت الوفاء", "مخبزة السعادة", "واحة عين صفراء"];

const HomeScreen = () => {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const isRTL = true;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string; icon?: string; subtitle?: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const { stores: allStores, loading: storesLoading, error: storesError } = useStores();
  const { results: searchResults, loading: searchLoading, handleSearch } = useSearch();
  const { itemCount } = useCart();
  const [isGuest, setIsGuest] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  const [activeSlide, setActiveSlide] = useState(0);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(HERO_SLIDES_TEMPLATES);
  const [heroLoading, setHeroLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    getActiveCategories().then((cats) => {
      setCategories(cats);
    });
    fetchProducts();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsGuest(!user);
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, image_url, store_id, stores(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      setProducts(data || []);
    } catch (e) {
      console.error("Error fetching products:", e);
    }
  };

  const handleStorePress = (storeId: string) => {
    router.push({ pathname: "/store-details", params: { id: storeId } });
  };

  const storesMap = useMemo(() => {
    const map = new Map<string, any>();
    allStores.forEach((s) => map.set(s.id, s));
    return map;
  }, [allStores]);

  const fetchHeroContent = useCallback(async () => {
    setHeroLoading(true);
    try {
      // 1. Try fetching Founder-managed hero slides from database first
      const dbSlides = await getActiveHeroSlides();
      if (dbSlides && dbSlides.length > 0) {
        const mappedSlides: HeroSlide[] = dbSlides.map((s) => ({
          id: s.id,
          image: s.image_url,
          title: s.title,
          description: s.subtitle || "",
          buttonLabel: s.cta_label || "تسوق الآن",
          storeId: s.content_type === "store" ? s.target_id || undefined : undefined,
          kind: s.content_type as any,
        }));
        setHeroSlides(mappedSlides);
        setHeroLoading(false);
        return;
      }

      const now = new Date().toISOString();

      const [alertsRes, promotionsRes, newStoresRes, newProductsRes] = await Promise.all([
        supabase.from("founder_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(3),
        supabase.from("store_promotions").select("*").eq("is_active", true).gte("starts_at", now).lte("ends_at", now).order("created_at", { ascending: false }).limit(10),
        supabase.from("stores").select("id, name, description, cover_url").eq("status", "active").eq("is_new", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("products").select("id, name, description, image_url, store_id, stores(name)").eq("status", "active").order("created_at", { ascending: false }).limit(3),
      ]);

      const couriersRes = await getAvailableCouriers();

      let slides: HeroSlide[] = [];

      if (!alertsRes.error && alertsRes.data && alertsRes.data.length > 0) {
        slides = alertsRes.data.map((alert: any) => ({
          id: `alert-${alert.id}`,
          image: "",
          title: alert.message,
          description: alert.category,
          buttonLabel: "عرض التفاصيل",
          kind: "alert",
        }));
      } else {
        const allPromotions = promotionsRes.data || [];
        const flashOffers = allPromotions.filter((p: any) => p.discount_type === "percentage" && p.discount_value >= 20);
        const otherPromotions = allPromotions.filter((p: any) => !(p.discount_type === "percentage" && p.discount_value >= 20));
        const candidatePromotions = flashOffers.length > 0 ? flashOffers : otherPromotions;

        if (candidatePromotions.length > 0 && !promotionsRes.error) {
          slides = candidatePromotions.map((p: any) => ({
            id: `promo-${p.id}`,
            image: p.image_url || "",
            title: flashOffers.length > 0 ? `🔥 ${p.title}` : p.title,
            description: p.description || `خصم ${p.discount_value}${p.discount_type === "percentage" ? "%" : p.discount_type === "free_delivery" ? " توصيل مجاني" : " د.ج"}`,
            buttonLabel: flashOffers.length > 0 ? "استفد الآن" : "تسوق الآن",
            storeId: p.store_id,
            kind: flashOffers.length > 0 ? "flash" : "promotion",
          }));
        } else if (!newStoresRes.error && newStoresRes.data && newStoresRes.data.length > 0) {
          slides = newStoresRes.data.map((s: any) => ({
            id: `store-${s.id}`,
            image: s.cover_url || "",
            title: `متجر جديد: ${s.name}`,
            description: s.description || "اكتشف منتجاتنا الجديدة",
            buttonLabel: "زرّار المتجر",
            storeId: s.id,
            storeName: s.name,
            kind: "store",
          }));
        } else if (!newProductsRes.error && newProductsRes.data && newProductsRes.data.length > 0) {
          slides = newProductsRes.data.map((p: any) => ({
            id: `product-${p.id}`,
            image: p.image_url || "",
            title: p.name,
            description: p.description || "منتج جديد",
            buttonLabel: "عرض المنتج",
            storeId: p.store_id,
            storeName: p.stores?.[0]?.name,
            kind: "product",
          }));
        } else if (!couriersRes.error && couriersRes.data && couriersRes.data.length > 0) {
          slides = couriersRes.data.slice(0, 3).map((c: any) => ({
            id: `courier-${c.id}`,
            image: c.avatar_url || "",
            title: c.full_name,
            description: `⭐ ${c.rating} • ${vehicleLabel(c.vehicle_type)}`,
            buttonLabel: "عرض الملف",
            kind: "courier",
          }));
        }
      }

      setHeroSlides(slides.length > 0 ? slides : HERO_SLIDES_TEMPLATES);
    } catch (e) {
      console.error("Error fetching hero content:", e);
      setHeroSlides(HERO_SLIDES_TEMPLATES);
    } finally {
      setHeroLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeroContent();
  }, [fetchHeroContent]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item, index }: { item: HeroSlide; index: number }) => {
    const heroStore = item.storeId ? storesMap.get(item.storeId) : allStores[index];

    const handlePress = () => {
      if (item.kind === "courier") {
        const courierId = item.id.replace("courier-", "");
        router.push({ pathname: "/courier/[id]", params: { id: courierId } });
      } else if (item.kind === "product") {
        const productId = item.id.replace("product-", "");
        router.push({ pathname: "/product-details", params: { id: productId } });
      } else if (item.storeId) {
        router.push({ pathname: "/store-details", params: { id: item.storeId } });
      } else if (heroStore) {
        router.push({ pathname: "/store-details", params: { id: heroStore.id } });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.heroSlide, { backgroundColor: colors.bgElevated }]}
        activeOpacity={!!(item.storeId || heroStore) ? 0.8 : 1}
        onPress={handlePress}
      >
        <View style={styles.heroImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={[styles.heroImage, { backgroundColor: colors.bgSurface }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.heroImage,
                {
                  backgroundColor: colors.bgElevated,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Typography variant="caption" color="disabled">
                صورة
              </Typography>
            </View>
          )}
          <View
            style={[
              styles.heroOverlay,
              { backgroundColor: "rgba(0, 0, 0, 0.35)" },
            ]}
          />
        </View>

        <View style={[styles.heroTextContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Typography variant="h2" align="right" style={[styles.heroTitle, { color: colors.primary }]}>
            {item.title}
          </Typography>
          <Typography variant="body" color="secondary" numberOfLines={2} align="right">
            {item.description}
          </Typography>
          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Typography variant="button" align="center" style={[styles.heroActionText, { color: colors.textOnBrand }]}>
              {item.buttonLabel}
            </Typography>
          </TouchableOpacity>
          <Typography variant="caption" color="disabled" align="right" style={styles.heroStoreLabel}>
            {heroStore ? heroStore.name : item.storeName || HERO_STORE_TITLES[index] || ""}
          </Typography>
        </View>
      </TouchableOpacity>
    );
  };

  const handleCategoryPress = async (catId: string) => {
    if (catId === "couriers") {
      router.push("/couriers");
      return;
    }
    setActiveCategory(catId);
    setActiveSubcategory("all");
    if (catId === "all") {
      setSubcategories([]);
    } else {
      const subs = await getActiveSubcategories(catId);
      setSubcategories(subs);
    }
  };

  const filteredStores = useMemo(() => {
    let result = allStores;

    if (activeCategory !== "all") {
      result = result.filter(
        (store: any) => store.main_category === activeCategory || store.category === activeCategory || store.category_id === activeCategory
      );
    }

    if (activeSubcategory !== "all") {
      result = result.filter(
        (store: any) => store.subcategory_id === activeSubcategory || store.sub_category === activeSubcategory
      );
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (store: any) =>
          store.name.toLowerCase().includes(q) ||
          (store.category && store.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allStores, activeCategory, activeSubcategory, searchQuery]);

  const displayedStores = searchQuery.length > 0 ? searchResults.stores : filteredStores;
  const loading = storesLoading || searchLoading;
  const error = storesError;

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

        {/* Hero Slider */}
        <View style={styles.section}>
          <FlatList
            ref={heroScrollRef}
            data={heroSlides}
            renderItem={renderHeroSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleHeroScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.heroListContent}
            bounces={false}
          />
          <View style={[styles.dotsContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {heroSlides.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: activeSlide === index ? colors.primary : colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  heroScrollRef.current?.scrollToIndex({ index, animated: true });
                }}
              />
            ))}
          </View>
        </View>

        {/* Login Banner - Only for guests */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.loginBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <View style={[styles.loginBannerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.loginBannerText}>
                <Typography variant="h3" align="right" color="brand">
                  مرحباً بك في سوق عين صفراء!
                </Typography>
                <Typography variant="caption" color="secondary" align="right" style={{ marginTop: 2 }}>
                  سجّل الدخول للطلب وحفظ مفضلتك ومتابعة التوصيل مباشرة
                </Typography>
              </View>
              <View style={styles.loginBannerBtn}>
                <Button
                  title="تسجيل الدخول"
                  onPress={() => router.push("/login")}
                  size="sm"
                  variant="primary"
                  icon={<LogIn size={16} color={colors.textOnBrand} />}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Couriers Banner */}
        <TouchableOpacity
          style={[
            styles.couriersBanner,
            {
              backgroundColor: colors.bgElevated,
              borderRightColor: colors.primary,
              borderRightWidth: 4,
            },
          ]}
          onPress={() => router.push('/couriers')}
          activeOpacity={0.8}
        >
          <View style={[styles.couriersBannerContent, { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={styles.couriersBannerText}>
              <Text style={[styles.couriersBannerTitle, { color: colors.textPrimary, fontWeight: '700', textAlign: 'right' }]}>الموصلون المتاحون</Text>
            </View>
            <View style={styles.couriersBannerIcon}>
              <Bike size={20} color={colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

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
            {/* Categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>الفئات</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                <TouchableOpacity key="all" onPress={() => { setActiveCategory("all"); setActiveSubcategory("all"); setSubcategories([]); }} style={[styles.categoryItem, { backgroundColor: activeCategory === "all" ? colors.primary + "18" : colors.bgSurface }]}>
                  <StoreIcon color={activeCategory === "all" ? colors.primary : colors.textSecondary} size={iconSizes.default} />
                  <Text style={[styles.categoryText, { color: activeCategory === "all" ? colors.primary : colors.textPrimary }]}>الكل</Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity key={category.id} onPress={() => handleCategoryPress(category.id)} style={[styles.categoryItem, { backgroundColor: activeCategory === category.id ? colors.primary + "18" : colors.bgSurface }]}>
                    <CategoryIcon category={category.name_ar} size="sm" variant={activeCategory === category.id ? "filled" : "subtle"} />
                    <Text style={[styles.categoryText, { color: activeCategory === category.id ? colors.primary : colors.textPrimary }]}>{category.name_ar}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Subcategories */}
            {subcategories.length > 0 && (
              <View style={styles.section}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                  <TouchableOpacity key="all-sub" onPress={() => setActiveSubcategory("all")} style={[styles.categoryItem, { backgroundColor: activeSubcategory === "all" ? colors.primary + "18" : colors.bgSurface }]}>
                    <StoreIcon color={activeSubcategory === "all" ? colors.primary : colors.textSecondary} size={iconSizes.default} />
                    <Text style={[styles.categoryText, { color: activeSubcategory === "all" ? colors.primary : colors.textPrimary }]}>الكل</Text>
                  </TouchableOpacity>
                  {subcategories.map((sub) => (
                    <TouchableOpacity key={sub.id} onPress={() => setActiveSubcategory(sub.id)} style={[styles.categoryItem, { backgroundColor: activeSubcategory === sub.id ? colors.primary + "18" : colors.bgSurface }]}>
                      <CategoryIcon category={sub.name_ar} size="sm" variant={activeSubcategory === sub.id ? "filled" : "subtle"} />
                      <Text style={[styles.categoryText, { color: activeSubcategory === sub.id ? colors.primary : colors.textPrimary }]}>{sub.name_ar}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured Stores */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>المتاجر المميزة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                {displayedStores.slice(0, 3).map((store: any) => (
                  <StoreCard
                    key={store.id}
                    id={store.id}
                    name={store.name}
                    category={getArabicCategoryName(store.main_category || store.category)}
                    subcategory={store.sub_category}
                    rating={store.rating?.toString() || "0.0"}
                    coverImage={store.cover_url}
                    logoImage={store.logo_url}
                    isOpen={store.is_open ?? store.status === "active"}
                    isFeatured={store.is_featured}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* New Stores */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>متاجر جديدة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                {displayedStores.slice(3, 6).map((store: any) => (
                  <StoreCard
                    key={store.id}
                    id={store.id}
                    name={store.name}
                    category={getArabicCategoryName(store.main_category || store.category)}
                    subcategory={store.sub_category}
                    rating={store.rating?.toString() || "0.0"}
                    coverImage={store.cover_url}
                    logoImage={store.logo_url}
                    isOpen={store.is_open ?? store.status === "active"}
                    isFeatured={store.is_featured}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Nearby Stores (Placeholder) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>متاجر قريبة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                {displayedStores.slice(6, 9).map((store: any) => (
                  <StoreCard
                    key={store.id}
                    id={store.id}
                    name={store.name}
                    category={getArabicCategoryName(store.main_category || store.category)}
                    subcategory={store.sub_category}
                    rating={store.rating?.toString() || "0.0"}
                    coverImage={store.cover_url}
                    logoImage={store.logo_url}
                    isOpen={store.is_open ?? store.status === "active"}
                    isFeatured={store.is_featured}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Special Offers (Placeholder) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>عروض خاصة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                {displayedStores.slice(9, 12).map((store: any) => (
                  <StoreCard
                    key={store.id}
                    id={store.id}
                    name={store.name}
                    category={getArabicCategoryName(store.main_category || store.category)}
                    subcategory={store.sub_category}
                    rating={store.rating?.toString() || "0.0"}
                    coverImage={store.cover_url}
                    logoImage={store.logo_url}
                    isOpen={store.is_open ?? store.status === "active"}
                    isFeatured={store.is_featured}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Featured Products - Guest only */}
            {isGuest && products.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>منتجات شائعة</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {products.map((product: any, index: number) => (
                    <View key={product.id || product.key || index} style={styles.productCol}>
                      <ProductCard
                        id={product.id}
                        name={product.name}
                        price={product.price_minor ? product.price_minor / 100 : 0}
                        image={product.image_url}
                        storeName={product.stores?.name}
                        onPress={() =>
                          router.push({ pathname: "/product-details", params: { id: product.id } })
                        }
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
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
  storesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row-reverse',
  },
  productCol: {
    width: 160,
    marginEnd: spacing.md,
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
  heroListContent: {
    paddingHorizontal: spacing.lg,
  },
  heroSlide: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.xs,
  },
  heroImageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  heroTextContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroTitle: {
    fontWeight: "700",
  },
  heroActionBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  heroActionText: {
    fontWeight: "600",
  },
  heroStoreLabel: {
    marginTop: spacing.xs,
  },
  dotsContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  couriersBanner: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },
  couriersBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couriersBannerText: {
    flex: 1,
  },
  couriersBannerTitle: {
    ...typography.title,
    fontWeight: '700',
  },
  couriersBannerIcon: {
    marginRight: spacing.sm,
  },
  loginBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.medium,
    padding: spacing.md,
    borderWidth: 1,
  },
  loginBannerContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBannerText: {
    flex: 1,
  },
  loginBannerBtn: {
    marginLeft: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default HomeScreen;
