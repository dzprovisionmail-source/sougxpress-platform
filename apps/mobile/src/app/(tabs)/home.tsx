import { useMarketPresence } from "@/hooks/useMarketPresence";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Image, RefreshControl, I18nManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, LayoutGrid, Store as StoreIcon, Tag, MapPin, Star, Bike, LogIn, Heart, Award, BadgePlus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LOGO_ICON, ICON_MASCOT_HEAD } from '@/constants/brand';

import { Input, StoreCard, CategoryIcon, Typography, ProductCard, Button, BrandWordmark } from '@/components/ui';
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
import { getAvailableCouriers } from '@/services/courierService';
import { getMarketSectionSettings, type MarketSectionSettings } from '@/services/market-section.service';
import { getStoreRotationSessionSeed, rotateNearbyStores, rotateStores, rotateWithinZoneGroups } from '@/services/storeRotation';
import { supabase } from '@/lib/supabase';
import DriverDashboardScreen from '../driver/dashboard';
import { AIN_SEFRA_ZONES } from '@/constants/ain-sefra-zones';
import { MarketHeroSlider } from '@/components/market/hero/MarketHeroSlider';
import type { HeroSlide } from '@/components/market/hero/hero.types';
import { isSafeExternalUrl, isSafeScreenPath } from '@/components/market/hero/hero.utils';
import { useMarketHeroSlides } from '@/hooks/useMarketHeroSlides';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const marketDebug = (...args: unknown[]) => console.log('[MARKET-DEBUG]', new Date().toISOString(), ...args);
const MARKET_SCROLL_STEP = SCREEN_WIDTH * 0.78 + spacing.sm;

type MarketArrowScrollViewProps = React.ComponentProps<typeof ScrollView> & {
  isRTL: boolean;
  arrowColor: string;
};

const MarketArrowScrollView = ({ isRTL, arrowColor, children, contentContainerStyle, ...scrollProps }: MarketArrowScrollViewProps) => {
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const epsilon = 2;
  const canMoveForward = isRTL ? offset < maxOffset - epsilon : offset > epsilon;
  const canMoveBackward = isRTL ? offset > epsilon : offset < maxOffset - epsilon;

  const move = (side: 'left' | 'right') => {
    const isForward = side === 'left';
    const coordinateDelta = isForward === isRTL ? MARKET_SCROLL_STEP : -MARKET_SCROLL_STEP;
    const nextOffset = Math.min(maxOffset, Math.max(0, offset + coordinateDelta));
    scrollRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  return (
    <View style={styles.marketArrowViewport}>
      <ScrollView
        {...scrollProps}
        ref={scrollRef}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>
      {canMoveForward && <TouchableOpacity style={[styles.marketArrow, styles.marketArrowLeft]} onPress={() => move('left')} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel="التمرير إلى اليسار">
        <ChevronLeft size={20} color={arrowColor} strokeWidth={2.8} />
      </TouchableOpacity>}
      {canMoveBackward && <TouchableOpacity style={[styles.marketArrow, styles.marketArrowRight]} onPress={() => move('right')} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel="التمرير إلى اليمين">
        <ChevronRight size={20} color={arrowColor} strokeWidth={2.8} />
      </TouchableOpacity>}
    </View>
  );
};
const toFiniteCoordinate = (value: unknown): number | null => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const distanceInKm = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const earthRadiusKm = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const haversine = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const zoneOrder = (zoneName?: string | null): number => {
  if (!zoneName) return AIN_SEFRA_ZONES.length + 1;
  const index = AIN_SEFRA_ZONES.findIndex((name) => name === zoneName);
  return index === -1 ? AIN_SEFRA_ZONES.length + 1 : index;
};

const HomeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string; identity?: string }>();
  useMarketPresence("market");
  const platformIdentity = params.identity === "soug-admin" && (params.preview === "1" || params.preview === undefined) ? "soug-admin" : undefined;
  const marketContextParams = platformIdentity ? { preview: "1", identity: platformIdentity } : {};
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
  const [storeRotationSeed, setStoreRotationSeed] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [customerLocation, setCustomerLocation] = useState<{ zoneId: string | null; latitude: number | null; longitude: number | null }>({ zoneId: null, latitude: null, longitude: null });
  const [zoneNames, setZoneNames] = useState<Record<string, string>>({});
  const [mostLikedProducts, setMostLikedProducts] = useState<any[]>([]);
  const [availableCourierCount, setAvailableCourierCount] = useState(0);

  const [marketSections, setMarketSections] = useState<MarketSectionSettings>({
    showSpecialOffers: true,
    showNewStores: true,
    showAllStores: true,
  });
  const { slides: heroSlides } = useMarketHeroSlides();

  useFocusEffect(useCallback(() => {
    marketDebug('HomeScreen focus');
    return () => marketDebug('HomeScreen blur');
  }, []));

  useEffect(() => {
    marketDebug('HomeScreen mount');
    checkAuth();
    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsGuest(!user);
      setStoreRotationSeed(getStoreRotationSessionSeed(user?.id));
    });
    getActiveCategories().then((cats) => {
      marketDebug('setCategories', { length: cats.length });
      setCategories(cats);
    });
    fetchProducts();
    fetchFavorites();
    fetchCustomerLocation();
    fetchMostLikedProducts();
    getAvailableCouriers().then(({ data }) => setAvailableCourierCount(data?.length || 0)).catch(() => setAvailableCourierCount(0));
    getMarketSectionSettings().then((res) => {
      setMarketSections(res);
    });
    return () => {
      marketDebug('HomeScreen unmount');
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    marketDebug('categories.length', categories.length);
  }, [categories.length]);

  useEffect(() => {
    marketDebug('allStores.length', allStores.length, { storesLoading, storesError });
  }, [allStores.length, storesLoading, storesError]);

  useEffect(() => {
    marketDebug('activeCategory/searchQuery', { activeCategory, searchQuery });
  }, [activeCategory, searchQuery]);

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
    setStoreRotationSeed(getStoreRotationSessionSeed(user?.id));
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
    marketDebug('fetchProducts:start');
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, image_url, price_minor, store_id, created_at, stores(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      marketDebug('fetchProducts:result', { length: data?.length ?? 0, error: error?.message ?? null });
      setProducts(data || []);
    } catch (e) {
      marketDebug('fetchProducts:error', e instanceof Error ? e.message : String(e));
      console.error("Error fetching products:", e);
    }
  };

  const fetchCustomerLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: address }, { data: customer }, { data: zones }] = await Promise.all([
        supabase
          .from("customer_addresses")
          .select("zone_id, latitude, longitude")
          .eq("customer_id", user.id)
          .eq("is_default", true)
          .maybeSingle(),
        supabase.from("customers").select("zone_id").eq("id", user.id).maybeSingle(),
        supabase.from("zones").select("id, name").eq("city", "Ain Sefra"),
      ]);

      const names: Record<string, string> = {};
      (zones || []).forEach((zone: any) => {
        if (zone.id && zone.name) names[zone.id] = zone.name;
      });
      setZoneNames(names);
      setCustomerLocation({
        zoneId: address?.zone_id || customer?.zone_id || null,
        latitude: toFiniteCoordinate(address?.latitude),
        longitude: toFiniteCoordinate(address?.longitude),
      });
    } catch (e) {
      console.warn("Market location unavailable; showing all stores safely.", e);
    }
  };

  const fetchMostLikedProducts = async () => {
    try {
      const { data: favorites, error } = await supabase
        .from("customer_favorites")
        .select("target_id")
        .eq("target_type", "product");
      if (error) throw error;

      const counts = new Map<string, number>();
      (favorites || []).forEach((favorite: any) => {
        if (favorite.target_id) counts.set(favorite.target_id, (counts.get(favorite.target_id) || 0) + 1);
      });
      const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
      if (ids.length === 0) {
        setMostLikedProducts([]);
        return;
      }

      const { data: likedProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name, description, image_url, price_minor, store_id, created_at, stores(name)")
        .eq("status", "active")
        .in("id", ids);
      if (productsError) throw productsError;
      const rank = new Map(ids.map((id, index) => [id, index]));
      setMostLikedProducts((likedProducts || []).sort((a: any, b: any) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)));
    } catch (e) {
      console.warn("Most-liked products unavailable; keeping the market available.", e);
      setMostLikedProducts([]);
    }
  };

  const handleStorePress = (storeId: string) => {
    router.push({
      pathname: "/store-details",
      params: { id: storeId, ...marketContextParams },
    });
  };

  const handleHeroPress = (slide: HeroSlide) => {
    if (slide.targetType === "STORE" && slide.targetId) {
      router.push({ pathname: "/store-details", params: { id: slide.targetId, ...marketContextParams } });
      return;
    }
    if (slide.targetType === "PRODUCT" && slide.targetId) {
      router.push({ pathname: "/product-details", params: { id: slide.targetId, ...marketContextParams } });
      return;
    }
    if (slide.targetType === "CATEGORY" && slide.targetId) {
      router.push({ pathname: "/market-section", params: { category: slide.targetId, ...marketContextParams } });
      return;
    }
    if (slide.targetType === "SCREEN" && isSafeScreenPath(slide.targetId)) {
      router.push(slide.targetId as never);
      return;
    }
    if (slide.targetType === "URL" && isSafeExternalUrl(slide.targetUrl)) {
      void Linking.openURL(slide.targetUrl).catch(() => undefined);
    }
  };

  const storesMap = useMemo(() => {
    const map = new Map<string, any>();
    allStores.forEach((s) => map.set(s.id, s));
    return map;
  }, [allStores]);

  const handleCategoryPress = async (catId: string) => {
    if (catId === "couriers") {
      router.push({ pathname: "/couriers", params: marketContextParams });
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
  const platformProfiles = searchQuery.length > 0 ? searchResults.platformProfiles : [];

  useEffect(() => {
    marketDebug('filteredStores.length/displayedStores.length', {
      filteredStores: filteredStores.length,
      displayedStores: displayedStores.length,
    });
  }, [filteredStores.length, displayedStores.length]);

  useEffect(() => {
    marketDebug('products.length', products.length);
  }, [products.length]);

  useEffect(() => {
    marketDebug('userRole/isGuest', { userRole, isGuest });
  }, [userRole, isGuest]);

  useEffect(() => {
    marketDebug('marketSections', marketSections);
  }, [marketSections]);

  marketDebug('HomeScreen render snapshot', {
    categories: categories.length,
    allStores: allStores.length,
    products: products.length,
    mostLikedProducts: mostLikedProducts.length,
    filteredStores: filteredStores.length,
    displayedStores: displayedStores.length,
    storesLoading,
    storesError,
    activeCategory,
    searchQuery,
  });

  const featuredStores = useMemo(
    () => rotateStores(
      displayedStores.filter((store: any) => store.is_featured === true && store.status === "active"),
      storeRotationSeed,
      "featured",
    ),
    [displayedStores, storeRotationSeed],
  );
  const newStores = useMemo(
    () => rotateStores(
      [...displayedStores].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
      storeRotationSeed,
      "new",
    ),
    [displayedStores, storeRotationSeed],
  );
  const nearbyStores = useMemo(() => {
    const stores = [...displayedStores];
    const { zoneId, latitude, longitude } = customerLocation;
    if (latitude !== null && longitude !== null) {
      const distanceSorted = stores.sort((a: any, b: any) => {
        const aLat = toFiniteCoordinate(a.latitude);
        const aLon = toFiniteCoordinate(a.longitude);
        const bLat = toFiniteCoordinate(b.latitude);
        const bLon = toFiniteCoordinate(b.longitude);
        const aDistance = aLat !== null && aLon !== null ? distanceInKm(latitude, longitude, aLat, aLon) : Number.POSITIVE_INFINITY;
        const bDistance = bLat !== null && bLon !== null ? distanceInKm(latitude, longitude, bLat, bLon) : Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
      return rotateNearbyStores(distanceSorted, storeRotationSeed, { zoneId, latitude, longitude });
    }
    if (zoneId) {
      const zoneSorted = stores.sort((a: any, b: any) => {
        const aSameZone = a.zone_id === zoneId ? 0 : 1;
        const bSameZone = b.zone_id === zoneId ? 0 : 1;
        if (aSameZone !== bSameZone) return aSameZone - bSameZone;
        return zoneOrder(zoneNames[a.zone_id]) - zoneOrder(zoneNames[b.zone_id]);
      });
      return rotateWithinZoneGroups(zoneSorted, storeRotationSeed);
    }
    return rotateStores(stores, storeRotationSeed, "nearby-no-location");
  }, [displayedStores, customerLocation, zoneNames, storeRotationSeed]);
  const allStoresForMarket = useMemo(
    () => rotateStores(displayedStores, storeRotationSeed, "all"),
    [displayedStores, storeRotationSeed],
  );
  const loading = storesLoading || searchLoading || newStoresLoading;
  const error = storesError;
  const openMarketSection = (section: 'featured' | 'new' | 'nearby' | 'all') => {
    router.push({ pathname: '/market-section', params: { section, ...marketContextParams } });
  };

  if (userRole === 'courier') {
    return <DriverDashboardScreen />;
  }

  return (
    <SafeAreaView
      style={[styles.fullContainer, { backgroundColor: colors.bgBase,  }]}
      onLayout={(event) => marketDebug('HomeScreen SafeAreaView layout', event.nativeEvent.layout)}
    >
      <StatusBar barStyle="dark-content" />
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => <View style={{ width: 16 }} />,
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
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/favorites', params: marketContextParams })}>
                <Heart color={colors.textPrimary} size={iconSizes.header} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgBase }]}
        contentContainerStyle={styles.pageContent}
        onLayout={(event) => marketDebug('Market ScrollView layout', event.nativeEvent.layout)}
        onContentSizeChange={(width, height) => marketDebug('Market ScrollView content size', { width, height })}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >


        {/* Brand + Search */}
        <View style={[styles.marketSearchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BrandWordmark size="market" style={styles.marketLogo} />
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
        </View>

        <MarketHeroSlider slides={heroSlides} colors={colors} isRTL={isRTL} onPressSlide={handleHeroPress} />

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

        {/* Compact courier availability strip */}
        <TouchableOpacity
          style={[
            styles.couriersBanner,
            {
              backgroundColor: colors.bgElevated,
              borderRightColor: colors.primary,
              borderRightWidth: 3,
              overflow: 'hidden',
              ...tokens.shadows.small,
            },
          ]}
          onPress={() => router.push({ pathname: '/couriers', params: marketContextParams })}
          activeOpacity={0.8}
        >
          <View style={styles.couriersStripContent}>
            <Bike size={20} color={colors.primary} />
            <Text style={[styles.couriersStripText, { color: colors.textPrimary }]}>الموصلون المتاحون الآن</Text>
            <View style={[styles.couriersCountPill, { backgroundColor: colors.primary + '16' }]}>
              <Text style={[styles.couriersCountText, { color: colors.primary }]}>{availableCourierCount} موصلين</Text>
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

        <>
            {/* Categories */}
            <View
              style={styles.section}
              onLayout={(event) => marketDebug('Categories section layout', event.nativeEvent.layout)}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign,  }]}>
الفئات</Text>
              <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                  <TouchableOpacity key="all" onPress={() => { setActiveCategory("all"); setActiveSubcategory("all"); setSubcategories([]); }} style={[styles.categoryItem, activeCategory === "all" && styles.categoryItemSelected, { backgroundColor: activeCategory === "all" ? colors.primary + "18" : colors.bgSurface, borderColor: activeCategory === "all" ? colors.primary : colors.borderSubtle }]}>
                  <View style={[styles.categoryIconFrame, { backgroundColor: activeCategory === "all" ? colors.primary : colors.bgElevated }]}>
                    <LayoutGrid color={activeCategory === "all" ? colors.textOnBrand : colors.primary} size={20} strokeWidth={2.2} />
                  </View>
                    <Text numberOfLines={1} style={[styles.categoryText, { color: activeCategory === "all" ? colors.primary : colors.textPrimary }]}>الكل</Text>
                  </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity key={category.id} onPress={() => handleCategoryPress(category.id)} style={[styles.categoryItem, activeCategory === category.id && styles.categoryItemSelected, { backgroundColor: activeCategory === category.id ? colors.primary + "18" : colors.bgSurface, borderColor: activeCategory === category.id ? colors.primary : colors.borderSubtle }]}>
                    <View style={[styles.categoryIconFrame, { backgroundColor: activeCategory === category.id ? colors.primary : colors.bgElevated }]}>
                      <CategoryIcon category={category.name_ar} size="sm" variant={activeCategory === category.id ? "plain" : "plain"} color={activeCategory === category.id ? colors.textOnBrand : colors.primary} />
                    </View>
                    <Text numberOfLines={1} style={[styles.categoryText, { color: activeCategory === category.id ? colors.primary : colors.textPrimary }]}>{category.name_ar}</Text>
                  </TouchableOpacity>
                ))}
              </MarketArrowScrollView>
            </View>

            {/* Subcategories */}
            {subcategories.length > 0 && (
              <View style={styles.section}>
                <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                  <TouchableOpacity key="all-sub" onPress={() => setActiveSubcategory("all")} style={[styles.categoryItem, activeSubcategory === "all" && styles.categoryItemSelected, { backgroundColor: activeSubcategory === "all" ? colors.primary + "18" : colors.bgSurface, borderColor: activeSubcategory === "all" ? colors.primary : colors.borderSubtle }]}>
                    <View style={[styles.categoryIconFrame, { backgroundColor: activeSubcategory === "all" ? colors.primary : colors.bgElevated }]}>
                      <LayoutGrid color={activeSubcategory === "all" ? colors.textOnBrand : colors.primary} size={20} strokeWidth={2.2} />
                    </View>
                    <Text numberOfLines={1} style={[styles.categoryText, { color: activeSubcategory === "all" ? colors.primary : colors.textPrimary }]}>الكل</Text>
                  </TouchableOpacity>
                  {subcategories.map((sub) => (
                    <TouchableOpacity key={sub.id} onPress={() => setActiveSubcategory(sub.id)} style={[styles.categoryItem, activeSubcategory === sub.id && styles.categoryItemSelected, { backgroundColor: activeSubcategory === sub.id ? colors.primary + "18" : colors.bgSurface, borderColor: activeSubcategory === sub.id ? colors.primary : colors.borderSubtle }]}>
                      <View style={[styles.categoryIconFrame, { backgroundColor: activeSubcategory === sub.id ? colors.primary : colors.bgElevated }]}>
                        <CategoryIcon category={sub.name_ar} size="sm" variant="plain" color={activeSubcategory === sub.id ? colors.textOnBrand : colors.primary} />
                      </View>
                      <Text numberOfLines={1} style={[styles.categoryText, { color: activeSubcategory === sub.id ? colors.primary : colors.textPrimary }]}>{sub.name_ar}</Text>
                    </TouchableOpacity>
                  ))}
                </MarketArrowScrollView>
              </View>
            )}

            {/* Official platform profiles */}
            {platformProfiles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign,  }]}>الحسابات الرسمية</Text>
                {platformProfiles.map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={[styles.platformProfileResult, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/platform-profile/[slug]', params: { slug: profile.slug, ...marketContextParams } })}
                  >
                    <Image source={LOGO_ICON} style={styles.platformProfileAvatar} resizeMode="contain" />
                    <View style={styles.platformProfileCopy}>
                      <Text style={[styles.platformProfileName, { color: colors.textPrimary }]}>{profile.display_name}</Text>
                      <Text style={[styles.platformProfileBio, { color: colors.textSecondary }]}>{profile.bio}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(() => {
              const renderStore = (store: any, featured = false) => (
                <View key={store.id} style={[styles.storeScrollItem, featured && styles.featuredStoreScrollItem]}>
                  <StoreCard
                    id={store.id}
                    name={store.name}
                    category={store.category_name || "غير مصنف"}
                    subcategory={store.sub_category}
                    rating={store.rating?.toString() || "0.0"}
                    coverImage={store.cover_url}
                    logoImage={store.logo_url}
                    store={store}
                    compact
                    marketFeatured={featured}
                    marketDetails
                    marketPrimary
                    isFeatured={store.is_featured}
                    isFavorite={favoriteStoreIds.includes(store.id)}
                    onToggleFavorite={isGuest ? undefined : () => handleToggleStoreFavorite(store.id)}
                    address={store.address_line1 ?? store.city ?? ""}
                    onPress={() => handleStorePress(store.id)}
                  />
                </View>
              );
              const renderProduct = (product: any, index: number) => (
                <View key={product.id || product.key || index} style={styles.productHorizontalItem}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price_minor ? product.price_minor / 100 : 0}
                    variant="grid"
                    style={styles.marketProductCard}
                    image={product.image_url}
                    storeName={product.stores?.name}
                    isFavorite={favoriteProductIds.includes(product.id)}
                    onToggleFavorite={isGuest ? undefined : () => handleToggleProductFavorite(product.id)}
                    onPress={() => router.push({ pathname: "/product-details", params: { id: product.id, ...marketContextParams } })}
                  />
                </View>
              );
              return <>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}><Award color={colors.primary} size={iconSizes.default} strokeWidth={2} /><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>المميزون</Text><TouchableOpacity onPress={() => openMarketSection('featured')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{(searchQuery.length > 0 ? displayedStores : featuredStores).slice(0, 6).map((store) => renderStore(store, true))}</MarketArrowScrollView>
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}><BadgePlus color={colors.primary} size={iconSizes.default} strokeWidth={2} /><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>متاجر جديدة</Text><TouchableOpacity onPress={() => openMarketSection('new')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{newStores.slice(0, 6).map((store) => renderStore(store))}</MarketArrowScrollView>
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}><MapPin color={colors.primary} size={iconSizes.default} strokeWidth={2} /><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>المتاجر القريبة منك</Text><TouchableOpacity onPress={() => openMarketSection('nearby')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{nearbyStores.slice(0, 4).map((store) => renderStore(store))}</MarketArrowScrollView>
                </View>
                <View style={[styles.section, styles.lastStoreSection]}>
                  <View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>كل المتاجر</Text><TouchableOpacity onPress={() => openMarketSection('all')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{allStoresForMarket.slice(0, 4).map((store) => renderStore(store))}</MarketArrowScrollView>
                </View>
                {products.length > 0 && <View style={styles.section}><View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>المنتجات</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>الأحدث</Text></View><MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.productHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{products.slice(0, 9).map(renderProduct)}</MarketArrowScrollView></View>}
                {mostLikedProducts.length > 0 && <View style={styles.section}><View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>الأكثر إعجابًا</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>الأكثر تفضيلًا</Text></View><MarketArrowScrollView isRTL={isRTL} arrowColor={colors.primary} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.productHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{mostLikedProducts.slice(0, 9).map(renderProduct)}</MarketArrowScrollView></View>}
                <View style={[styles.marketFooter, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.marketFooterBrand, { color: colors.primary }]}>Soug XPRESS</Text>
                  <Text style={[styles.marketFooterText, { color: colors.textSecondary }]}>منصة تجارة محلية لمدينة عين الصفراء</Text>
                </View>
              </>;
            })()}
        </>
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
  marketSearchRow: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  marketLogo: {
    flexShrink: 0,
  },
  searchContainer: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.medium,
    ...shadows.small,
  },
  section: {
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'stretch',
      },
  pageContent: {
        alignItems: 'stretch',
    paddingBottom: spacing.xl,
  },
  sectionTitleRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
        marginBottom: 0,
    paddingHorizontal: 0,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  categoryItem: {
    width: 76,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  categoryItemSelected: {
    borderWidth: 1.5,
    transform: [{ translateY: -1 }],
  },
  categoryIconFrame: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    maxWidth: 70,
    textAlign: 'center',
      },
  horizontalRtl: {
    direction: 'rtl',
      },
  storesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
      },
  storeGrid: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storeGridItem: {
    width: '48.5%',
  },
  storeHorizontalContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  storeHorizontalRtl: {
    flexDirection: 'row-reverse',
  },
  marketArrowViewport: {
    position: 'relative',
    paddingHorizontal: spacing.lg,
  },
  marketArrow: {
    position: 'absolute',
    top: '42%',
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97316',
    ...shadows.small,
  },
  marketArrowLeft: {
    left: spacing.xs,
  },
  marketArrowRight: {
    right: spacing.xs,
  },
  storeScrollItem: {
    width: SCREEN_WIDTH * 0.78,
  },
  featuredStoreScrollItem: {
    width: SCREEN_WIDTH * 0.78,
  },
  productGrid: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productGridItem: {
    width: '31.5%',
  },
  productHorizontalContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  productHorizontalItem: {
    width: 214,
  },
  marketFooter: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  marketFooterBrand: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  marketFooterText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  marketProductCard: {
    borderWidth: 1,
    borderColor: '#00000012',
    borderRadius: radius.md,
    ...shadows.small,
  },
  lastStoreSection: {
    marginBottom: spacing.xs,
  },
  showAllText: {
    ...typography.caption,
    fontWeight: '800',
  },
  sectionHint: {
    ...typography.caption,
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
  couriersBanner: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  couriersStripContent: {
    minHeight: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  couriersStripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  couriersCountPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  couriersCountText: {
    fontSize: 12,
    fontWeight: '800',
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
    textAlign: 'right',
      },
  couriersBannerIcon: {
    marginEnd: spacing.sm,
  },
  loginBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  loginBannerContent: {
    flexDirection: 'row',
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
  platformProfileResult: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    ...shadows.small,
  },
  platformProfileAvatar: {
    width: 56,
    height: 56,
    marginStart: spacing.md,
  },
  platformProfileCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  platformProfileName: {
    ...typography.title,
    fontWeight: '700',
    textAlign: 'right',
  },
  platformProfileBio: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});

export default HomeScreen;
