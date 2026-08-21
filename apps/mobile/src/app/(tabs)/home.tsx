import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Image, RefreshControl, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, Store as StoreIcon, Tag, MapPin, Star, Bike, LogIn, Heart } from 'lucide-react-native';
import { LOGO_WORDMARK, ICON_MASCOT_SCOOTER, ICON_MASCOT_HEAD, BANNER_FRESH, BANNER_BAKERY, BANNER_DELIVERY } from '@/constants/brand';

import { Input, StoreCard, CategoryIcon, Typography, ProductCard, Button } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
import { radius } from '@/design/radius';
import { shadows } from '@/design/shadows';

import { useStores, useSearch, useNewStores } from '@/hooks/useStores';
import useCart from '@/hooks/useCart';
import { toggleFavorite, getFavoriteIds } from '@/services/favorite.service';
import { getActiveCategories, getActiveSubcategories } from '@/services/category.service';
import { getArabicCategoryName } from '@/config/storeCategories';
import { getAvailableCouriers, vehicleLabel } from '@/services/courierService';
import { getActiveHeroSlides, getHeroSliderSettings, getMarketSectionSettings, MarketSectionSettings } from '@/services/heroSlider.service';
import { supabase } from '@/lib/supabase';
import DriverDashboardScreen from '../driver/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
  target_id?: string;
  kind?: "alert" | "promotion" | "flash" | "store" | "product" | "courier";
}

const HERO_SLIDES_TEMPLATES: Omit<HeroSlide, "storeId" | "storeName">[] = [
  {
    id: "1",
    image: Image.resolveAssetSource(BANNER_FRESH).uri,
    title: "عروض الأسبوع",
    description: "خصومات حصرية على الخضروات والفواكه الطازجة",
    buttonLabel: "تسوق الآن",
  },
  {
    id: "2",
    image: Image.resolveAssetSource(BANNER_BAKERY).uri,
    title: "متجر جديد في السوق",
    description: "مخبزة السعادة تفتح أبوابها — خبز طازج يومياً",
    buttonLabel: "اكتشف المتجر",
  },
  {
    id: "3",
    image: Image.resolveAssetSource(BANNER_DELIVERY).uri,
    title: "توصيل مجاني",
    description: "لأول طلب لك — يوصلك لبابك بدون رسوم",
    buttonLabel: "اطلب الآن",
  },
];

const HERO_STORE_TITLES = ["سوبر ماركت الوفاء", "مخبزة السعادة", "واحة عين صفراء"];

const HomeScreen = () => {
  const router = useRouter();
  const { colors, tokens, isRTL, textAlign } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string; icon?: string; subtitle?: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const { stores: allStores, loading: storesLoading, error: storesError } = useStores();
  const { stores: newStoresData, loading: newStoresLoading } = useNewStores(6);
  const { results: searchResults, loading: searchLoading, handleSearch } = useSearch();
  const { itemCount } = useCart();
  const [isGuest, setIsGuest] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

  const [activeSlide, setActiveSlide] = useState(0);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(HERO_SLIDES_TEMPLATES);
  const [heroLoading, setHeroLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(3);
  const [marketSections, setMarketSections] = useState<MarketSectionSettings>({
    showSpecialOffers: true,
    showNewStores: true,
    showAllStores: true,
  });

  useEffect(() => {
    checkAuth();
    getActiveCategories().then((cats) => {
      setCategories(cats);
    });
    fetchProducts();
    fetchFavorites();
    getMarketSectionSettings().then((res) => {
      setMarketSections(res);
    });
  }, []);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [storeIds, productIds] = await Promise.all([
        getFavoriteIds('store'),
        getFavoriteIds('product')
      ]);
      setFavoriteStoreIds(storeIds);
      setFavoriteProductIds(productIds);
    }
  };

  const handleToggleStoreFavorite = async (storeId: string) => {
    const { isFavorite, error } = await toggleFavorite('store', storeId);
    if (!error) {
      setFavoriteStoreIds(prev => 
        isFavorite ? [...prev, storeId] : prev.filter(id => id !== storeId)
      );
    }
  };

  const handleToggleProductFavorite = async (productId: string) => {
    const { isFavorite, error } = await toggleFavorite('product', productId);
    if (!error) {
      setFavoriteProductIds(prev => 
        isFavorite ? [...prev, productId] : prev.filter(id => id !== productId)
      );
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsGuest(!user);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setUserRole(profile?.role || null);
    }
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
      const settings = await getHeroSliderSettings();
      setAutoRotate(settings.autoRotate);
      setRotationInterval(settings.intervalSeconds);

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
          target_id: s.target_id || undefined,
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

  // Automatic hero slider rotation based on settings
  useEffect(() => {
    if (!autoRotate || !heroSlides || heroSlides.length <= 1) return;
    const intervalMs = Math.max(rotationInterval, 1) * 1000;
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % heroSlides.length;
        try {
          heroScrollRef.current?.scrollToIndex({ index: next, animated: true });
        } catch (e) {
          // Ignore scroll index out of bounds during fast updates
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [heroSlides, autoRotate, rotationInterval]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item, index }: { item: HeroSlide; index: number }) => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const heroStore = item.storeId ? storesMap.get(item.storeId) : allStores[index];

    const handlePress = () => {
      const targetProd = (item as any).target_product_id || ((item.kind === "product" && UUID_REGEX.test((item as any).target_id)) ? (item as any).target_id : null);
      const targetStore = (item as any).target_store_id || item.storeId || ((item.kind === "store" && UUID_REGEX.test((item as any).target_id)) ? (item as any).target_id : null);

      if (item.kind === "courier") {
        const courierId = item.id.replace("courier-", "");
        router.push({ pathname: "/courier/[id]", params: { id: courierId } });
      } else if (targetProd && UUID_REGEX.test(targetProd)) {
        router.push({ pathname: "/product-details", params: { id: targetProd } });
      } else if (targetStore && UUID_REGEX.test(targetStore)) {
        router.push({ pathname: "/store-details", params: { id: targetStore } });
      } else if (heroStore && UUID_REGEX.test(heroStore.id)) {
        router.push({ pathname: "/store-details", params: { id: heroStore.id } });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.heroSlide, { backgroundColor: colors.bgElevated, ...tokens.shadows.premium }]}
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
                Soug-XPRESS
              </Typography>
            </View>
          )}
          {/* Professional Overlay with Gradient effect using semi-transparent colors */}
          <View style={[styles.heroOverlay, { backgroundColor: "rgba(0,0,0,0.25)" }]} />
          
          <View style={[styles.heroTextContentOverlay, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <Typography
              variant="h2"
              color="white"
              align="right"
              style={[styles.heroTitle, { textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 }]}
            >
              {item.title}
            </Typography>
            <Typography 
              variant="body" 
              color="white" 
              align="right"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 5 }}
            >
              {item.description}
            </Typography>

            <View style={styles.heroActionRow}>
              <View
                style={[
                  styles.heroActionBtn,
                  { backgroundColor: colors.primary, ...tokens.shadows.small },
                ]}
              >
                <Typography
                  variant="button"
                  color="white"
                  style={styles.heroActionText}
                >
                  {item.buttonLabel}
                </Typography>
              </View>
              
              <View
                style={[
                  styles.heroStoreLabelOverlay,
                  { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, borderRadius: 4 }
                ]}
              >
                <Typography variant="caption" color="white" align="right">
                  {heroStore ? heroStore.name : item.storeName || HERO_STORE_TITLES[index] || "سوق عين صفراء"}
                </Typography>
                <StoreIcon color="white" size={12} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>
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
  const loading = storesLoading || searchLoading || newStoresLoading;
  const error = storesError;

  if (userRole === 'courier') {
    return <DriverDashboardScreen />;
  }

  return (
    <SafeAreaView style={[styles.fullContainer, { backgroundColor: colors.bgBase, direction: isRTL ? 'rtl' : 'ltr' }]}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => (
            <View style={{ paddingLeft: 16 }}>
              <Image 
                source={LOGO_WORDMARK} 
                style={{ width: 120, height: 30 }} 
                resizeMode="contain" 
              />
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => router.push('/cart')}>
                <ShoppingCart color={colors.textPrimary} size={iconSizes.header} />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={[styles.cartBadgeText, { color: colors.textOnBrand }]}>{itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(tabs)/favorites')}>
                <Heart color={colors.textPrimary} size={iconSizes.header} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]} contentContainerStyle={styles.pageContent}>


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
          <View style={styles.dotsContainer}>
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
            style={[styles.loginBanner, { backgroundColor: colors.bgElevated, borderColor: colors.primary + '40', borderWidth: 1, ...tokens.shadows.premium }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <View style={styles.loginBannerContent}>
              <Image source={ICON_MASCOT_HEAD} style={{ width: 60, height: 60 }} resizeMode="contain" />
              <View style={[styles.loginBannerText, { flex: 1, marginHorizontal: 12 }]}>
                <Typography variant="h3" align="right" color="brand">
                  مرحباً بك في سوق عين صفراء!
                </Typography>
                <Typography variant="caption" color="secondary" align="right" style={{ marginTop: 2 }}>
                  سجّل الدخول للطلب وحفظ مفضلتك ومتابعة التوصيل مباشرة
                </Typography>
              </View>
              <View style={styles.loginBannerBtn}>
                <Button
                  title="دخول"
                  onPress={() => router.push("/login")}
                  size="sm"
                  variant="primary"
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
              overflow: 'hidden',
              ...tokens.shadows.small,
            },
          ]}
          onPress={() => router.push('/couriers')}
          activeOpacity={0.8}
        >
          <View style={styles.couriersBannerContent}>
            <View style={[styles.couriersBannerText, { flex: 1 }]}>
              <Text style={[styles.couriersBannerTitle, { color: colors.textPrimary, fontWeight: '700', textAlign: 'right' }]}>الموصلون المتاحون</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'right' }}>اطلب توصيل مباشر من الموصل المفضل لديك</Text>
            </View>
            <Image source={ICON_MASCOT_SCOOTER} style={{ width: 80, height: 80, marginRight: -10 }} resizeMode="contain" />
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
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
الفئات</Text>
              <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
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
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
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
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
المتاجر المميزة</Text>
              <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                {(searchQuery.length > 0 ? displayedStores.slice(0, 6) : allStores.filter(s => s.is_featured).slice(0, 6)).map((store: any) => (
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
	                    isFavorite={favoriteStoreIds.includes(store.id)}
	                    onToggleFavorite={isGuest ? undefined : () => handleToggleStoreFavorite(store.id)}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* New Stores */}
            {marketSections.showNewStores && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
متاجر جديدة</Text>
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {(searchQuery.length > 0 ? [] : newStoresData).map((store: any) => (
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
	                    isFavorite={favoriteStoreIds.includes(store.id)}
	                    onToggleFavorite={isGuest ? undefined : () => handleToggleStoreFavorite(store.id)}
                      address={store.address_line1 ?? store.city ?? ""}
                      onPress={() => handleStorePress(store.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Nearby Stores (Placeholder) */}
            {marketSections.showAllStores && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
متاجر قريبة</Text>
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
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
	                    isFavorite={favoriteStoreIds.includes(store.id)}
	                    onToggleFavorite={isGuest ? undefined : () => handleToggleStoreFavorite(store.id)}
                      address={store.address_line1 ?? store.city ?? ""}
                      onPress={() => handleStorePress(store.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Special Offers (Placeholder / Promotions) */}
            {marketSections.showSpecialOffers && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
عروض خاصة</Text>
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {displayedStores.filter((s: any) => s.is_featured).slice(6, 9).map((store: any) => (
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
	                    isFavorite={favoriteStoreIds.includes(store.id)}
	                    onToggleFavorite={isGuest ? undefined : () => handleToggleStoreFavorite(store.id)}
                      address={store.address_line1 ?? store.city ?? ""}
                      onPress={() => handleStorePress(store.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured Products - Guest only */}
            {isGuest && products.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
منتجات شائعة</Text>
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {products.map((product: any, index: number) => (
                    <View key={product.id || product.key || index} style={styles.productCol}>
                      <ProductCard
                        id={product.id}
                        name={product.name}
                        price={product.price_minor ? product.price_minor / 100 : 0}
	                        image={product.image_url}
	                        storeName={product.stores?.name}
	                        isFavorite={favoriteProductIds.includes(product.id)}
	                        onToggleFavorite={isGuest ? undefined : () => handleToggleProductFavorite(product.id)}
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
    width: '100%',
    alignItems: 'stretch',
    direction: 'rtl',
  },
  pageContent: {
    direction: 'rtl',
    alignItems: 'stretch',
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.title,
    alignSelf: 'stretch',
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'flex-start',
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  horizontalRtl: {
    direction: 'rtl',
  },
  storesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
    direction: 'rtl',
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
    height: 220,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.lg,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
  },
  heroTextContentOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroTitle: {
    fontWeight: "800",
    fontSize: 24,
  },
  heroActionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heroActionBtn: {
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  heroStoreLabelOverlay: {
    marginTop: 0,
  },
  heroActionText: {
    fontWeight: "600",
  },
  heroStoreLabel: {
    marginTop: spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    direction: 'rtl',
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
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couriersBannerText: {
    flex: 1,
  },
  couriersBannerTitle: {
    ...typography.title,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  couriersBannerIcon: {
    marginEnd: spacing.sm,
  },
  loginBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.medium,
    padding: spacing.md,
    borderWidth: 1,
  },
  loginBannerContent: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBannerText: {
    flex: 1,
  },
  loginBannerBtn: {
    marginStart: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default HomeScreen;
