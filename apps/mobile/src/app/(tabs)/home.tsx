import { useMarketPresence } from "@/hooks/useMarketPresence";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Image, RefreshControl, I18nManager, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Search as SearchIcon, ShoppingCart, LayoutGrid, Store as StoreIcon, Tag, MapPin, Star, Bike, LogIn, Heart, Award, BadgePlus } from 'lucide-react-native';
import { LOGO_ICON, ICON_MASCOT_HEAD, BANNER_FRESH, BANNER_BAKERY, BANNER_DELIVERY } from '@/constants/brand';

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
import { getActiveHeroSlides, getHeroSliderSettings, getSmartHeroSliderSettings, getMarketSectionSettings, MarketSectionSettings } from '@/services/heroSlider.service';
import { getSmartHeroSlides } from '@/services/smartHeroSlider.service';
import { buildFinalHeroSlides, normalizeRuntimeSlides, MAX_HERO_SLIDES, type RuntimeHeroSlide as HeroSlide } from '@/services/heroSlider.runtime';
import { getStoreRotationSessionSeed, rotateNearbyStores, rotateStores, rotateWithinZoneGroups } from '@/services/storeRotation';
import { supabase } from '@/lib/supabase';
import DriverDashboardScreen from '../driver/dashboard';
import { AIN_SEFRA_ZONES } from '@/constants/ain-sefra-zones';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// The card width and item interval are shared by layout, snapping, offsets, and dots.
// The 12px trailing peek follows the standard commerce carousel pattern.
const HERO_CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md;
const HERO_ITEM_MARGIN = spacing.xs;
const HERO_SLIDE_INTERVAL = HERO_CARD_WIDTH + HERO_ITEM_MARGIN * 2;
const HERO_LIST_PADDING = spacing.lg + HERO_ITEM_MARGIN;
const HERO_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };
const assetUri = (asset: number): string => {
  const resolver = (Image as typeof Image & { resolveAssetSource?: (value: number) => { uri?: string } }).resolveAssetSource;
  return typeof resolver === "function" ? resolver(asset).uri ?? "" : String(asset);
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

const HERO_SLIDES_TEMPLATES: Omit<HeroSlide, "storeId" | "storeName">[] = [
  {
    id: "1",
    image: assetUri(BANNER_FRESH),
    title: "عروض الأسبوع",
    description: "خصومات حصرية على الخضروات والفواكه الطازجة",
    buttonLabel: "تسوق الآن",
    kind: "promotion",
  },
  {
    id: "2",
    image: assetUri(BANNER_BAKERY),
    title: "متجر جديد في السوق",
    description: "مخبزة السعادة تفتح أبوابها — خبز طازج يومياً",
    buttonLabel: "اكتشف المتجر",
    kind: "store",
  },
  {
    id: "3",
    image: assetUri(BANNER_DELIVERY),
    title: "توصيل مجاني",
    description: "لأول طلب لك — يوصلك لبابك بدون رسوم",
    buttonLabel: "اطلب الآن",
    kind: "promotion",
  },
];

const HERO_STORE_TITLES = ["سوبر ماركت الوفاء", "مخبزة السعادة", "واحة عين صفراء"];

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

  const [activeSlide, setActiveSlide] = useState(0);
  const activeSlideRef = useRef(0);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(3);
  const [heroSettings, setHeroSettings] = useState({ mode: "manual" as "manual" | "smart" | "hybrid", pauseOnTouch: true, resumeDelaySeconds: 4, transitionMs: 350, transitionType: "slide" as "slide" | "fade" });
  const heroResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroPausedRef = useRef(false);
  const heroFadeOpacity = useRef(new Animated.Value(1)).current;
  const heroOffsetRef = useRef(0);
  const [marketSections, setMarketSections] = useState<MarketSectionSettings>({
    showSpecialOffers: true,
    showNewStores: true,
    showAllStores: true,
  });

  useEffect(() => {
    checkAuth();
    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsGuest(!user);
      setStoreRotationSeed(getStoreRotationSessionSeed(user?.id));
    });
    getActiveCategories().then((cats) => {
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
    return () => authSubscription.subscription.unsubscribe();
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
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, image_url, price_minor, store_id, created_at, stores(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      setProducts(data || []);
    } catch (e) {
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

  const storesMap = useMemo(() => {
    const map = new Map<string, any>();
    allStores.forEach((s) => map.set(s.id, s));
    return map;
  }, [allStores]);

  const fetchHeroContent = useCallback(async () => {
    setHeroLoading(true);
    try {
      const [settings, smartSettings] = await Promise.all([getHeroSliderSettings(), getSmartHeroSliderSettings()]);
      setAutoRotate(settings.autoRotate);
      setRotationInterval(settings.intervalSeconds);
      const mode = smartSettings.mode || (smartSettings.smartMode ? "smart" : "manual");
      setHeroSettings({ mode, pauseOnTouch: smartSettings.pauseOnTouch, resumeDelaySeconds: smartSettings.resumeDelaySeconds, transitionMs: smartSettings.transitionMs, transitionType: smartSettings.transitionType });
      const [dbSlides, smartSlides] = await Promise.all([
        getActiveHeroSlides(),
        mode === "manual" ? Promise.resolve([]) : getSmartHeroSlides(smartSettings, MAX_HERO_SLIDES),
      ]);
      const finalSlides = normalizeRuntimeSlides(buildFinalHeroSlides(mode, dbSlides, smartSlides));
      if (finalSlides.length > 0) {
        setHeroSlides(finalSlides);
        return;
      }

      if (mode !== "manual") {
        setHeroSlides(HERO_SLIDES_TEMPLATES);
        return;
      }

      setHeroSlides([]);
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

  const pauseHeroOnTouch = useCallback(() => {
    if (!heroSettings.pauseOnTouch) return;
    heroPausedRef.current = true;
    if (heroResumeTimerRef.current) clearTimeout(heroResumeTimerRef.current);
    heroResumeTimerRef.current = setTimeout(() => {
      heroPausedRef.current = false;
      heroResumeTimerRef.current = null;
    }, Math.max(1, heroSettings.resumeDelaySeconds) * 1000);
  }, [heroSettings.pauseOnTouch, heroSettings.resumeDelaySeconds]);

  const animateHeroTo = useCallback((index: number, durationOverride?: number) => {
    if (heroSlides.length === 0) return;
    const safeIndex = Math.max(0, Math.min(heroSlides.length - 1, index));
    const transitionMs = Math.max(150, Math.min(1000, durationOverride ?? heroSettings.transitionMs));
    activeSlideRef.current = safeIndex;
    setActiveSlide(safeIndex);
    if (heroSettings.transitionType === "fade") {
      Animated.sequence([
        Animated.timing(heroFadeOpacity, { toValue: 0, duration: Math.max(75, Math.floor(transitionMs / 2)), useNativeDriver: true }),
        Animated.timing(heroFadeOpacity, { toValue: 1, duration: Math.max(75, Math.floor(transitionMs / 2)), useNativeDriver: true }),
      ]).start();
      heroScrollRef.current?.scrollToIndex({ index: safeIndex, animated: false, viewPosition: 0 });
    } else {
      heroScrollRef.current?.scrollToIndex({ index: safeIndex, animated: true, viewPosition: 0 });
    }
  }, [heroFadeOpacity, heroSettings.transitionMs, heroSettings.transitionType, heroSlides.length]);

  useEffect(() => () => {
    if (heroResumeTimerRef.current) clearTimeout(heroResumeTimerRef.current);
    if (heroAutoTimerRef.current) clearTimeout(heroAutoTimerRef.current);
  }, []);

  const heroSlideKey = heroSlides.map((slide) => slide.id).join("|");
  useEffect(() => {
    if (heroSlides.length === 0) return;
    activeSlideRef.current = 0;
    setActiveSlide(0);
    heroOffsetRef.current = 0;
    requestAnimationFrame(() => heroScrollRef.current?.scrollToIndex({ index: 0, animated: false, viewPosition: 0 }));
  }, [heroSlideKey, heroSlides.length]);

  // Automatic hero slider rotation based on settings. A recursive timeout keeps
  // the schedule stable across transitions and retries promptly after a pause.
  useEffect(() => {
    if (heroAutoTimerRef.current) clearTimeout(heroAutoTimerRef.current);
    if (!autoRotate || heroSlides.length <= 1) return;

    let cancelled = false;
    const scheduleNext = () => {
      if (cancelled) return;
      const current = heroSlides[activeSlideRef.current];
      const delayMs = heroPausedRef.current
        ? 250
        : Math.max(current?.display_duration_seconds ?? rotationInterval, 1) * 1000;
      heroAutoTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        if (!heroPausedRef.current) {
          const next = (activeSlideRef.current + 1) % heroSlides.length;
          animateHeroTo(next, heroSlides[next]?.transition_duration_ms);
        }
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (heroAutoTimerRef.current) clearTimeout(heroAutoTimerRef.current);
      heroAutoTimerRef.current = null;
    };
  }, [heroSlides, autoRotate, rotationInterval, animateHeroTo]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    heroOffsetRef.current = contentOffsetX;
  };

  const handleHeroViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const visibleIndex = viewableItems.find((item) => item.index !== null)?.index;
    if (visibleIndex === undefined || visibleIndex === null || visibleIndex < 0 || visibleIndex >= heroSlides.length) return;
    if (visibleIndex === activeSlideRef.current) return;
    activeSlideRef.current = visibleIndex;
    setActiveSlide(visibleIndex);
  }, [heroSlides.length]);

  const renderHeroSlide = ({ item, index }: { item: HeroSlide; index: number }) => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const heroStore = item.storeId ? storesMap.get(item.storeId) : allStores[index];

    const handlePress = () => {
      const targetProd = (item as any).target_product_id || ((item.kind === "product" && UUID_REGEX.test((item as any).target_id)) ? (item as any).target_id : null);
      const targetStore = (item as any).target_store_id || item.storeId || ((item.kind === "store" && UUID_REGEX.test((item as any).target_id)) ? (item as any).target_id : null);

      if (item.kind === "courier") {
        const courierId = item.id.replace("courier-", "");
        router.push({ pathname: "/courier/[id]", params: { id: courierId, ...marketContextParams } });
      } else if (targetProd && UUID_REGEX.test(targetProd)) {
        router.push({ pathname: "/product-details", params: { id: targetProd, ...marketContextParams } });
      } else if (targetStore && UUID_REGEX.test(targetStore)) {
        handleStorePress(targetStore);
      } else if (heroStore && UUID_REGEX.test(heroStore.id)) {
        handleStorePress(heroStore.id);
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
    <SafeAreaView style={[styles.fullContainer, { backgroundColor: colors.bgBase,  }]}>
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

        {/* Hero Slider */}
        <View style={styles.section}>
          <Animated.View style={{ opacity: heroFadeOpacity }}>
          <FlatList
            ref={heroScrollRef}
            data={heroSlides}
            renderItem={renderHeroSlide}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={heroLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            getItemLayout={(_, index) => ({ length: HERO_SLIDE_INTERVAL, offset: HERO_SLIDE_INTERVAL * index, index })}
            initialNumToRender={MAX_HERO_SLIDES}
            maxToRenderPerBatch={MAX_HERO_SLIDES}
            windowSize={MAX_HERO_SLIDES}
            updateCellsBatchingPeriod={0}
            removeClippedSubviews={false}
            horizontal
            snapToInterval={HERO_SLIDE_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={handleHeroScroll}
            viewabilityConfig={HERO_VIEWABILITY_CONFIG}
            onViewableItemsChanged={handleHeroViewableItemsChanged}
            onTouchStart={pauseHeroOnTouch}
            onMomentumScrollBegin={pauseHeroOnTouch}
            onScrollBeginDrag={pauseHeroOnTouch}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => heroScrollRef.current?.scrollToOffset({ offset: index * HERO_SLIDE_INTERVAL, animated: false }));
            }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.heroListContent}
            bounces={false}
          />
          </Animated.View>
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
                  animateHeroTo(index);
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

        {!loading && !error && (
          <>
            {/* Categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign,  }]}>
الفئات</Text>
              <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
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
              </ScrollView>
            </View>

            {/* Subcategories */}
            {subcategories.length > 0 && (
              <View style={styles.section}>
                <ScrollView horizontal style={styles.horizontalRtl} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
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
                </ScrollView>
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
                  <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{(searchQuery.length > 0 ? displayedStores : featuredStores).slice(0, 6).map((store) => renderStore(store, true))}</ScrollView>
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}><BadgePlus color={colors.primary} size={iconSizes.default} strokeWidth={2} /><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>متاجر جديدة</Text><TouchableOpacity onPress={() => openMarketSection('new')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{newStores.slice(0, 6).map((store) => renderStore(store))}</ScrollView>
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}><MapPin color={colors.primary} size={iconSizes.default} strokeWidth={2} /><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>المتاجر القريبة منك</Text><TouchableOpacity onPress={() => openMarketSection('nearby')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{nearbyStores.slice(0, 4).map((store) => renderStore(store))}</ScrollView>
                </View>
                <View style={[styles.section, styles.lastStoreSection]}>
                  <View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>كل المتاجر</Text><TouchableOpacity onPress={() => openMarketSection('all')}><Text style={[styles.showAllText, { color: colors.primary }]}>إظهار الكل</Text></TouchableOpacity></View>
                  <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.storeHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{allStoresForMarket.slice(0, 4).map((store) => renderStore(store))}</ScrollView>
                </View>
                {products.length > 0 && <View style={styles.section}><View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>المنتجات</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>الأحدث</Text></View><ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.productHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{products.slice(0, 9).map(renderProduct)}</ScrollView></View>}
                {mostLikedProducts.length > 0 && <View style={styles.section}><View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>الأكثر إعجابًا</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>الأكثر تفضيلًا</Text></View><ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={[styles.productHorizontalContent, isRTL && styles.storeHorizontalRtl]}>{mostLikedProducts.slice(0, 9).map(renderProduct)}</ScrollView></View>}
                <View style={[styles.marketFooter, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.marketFooterBrand, { color: colors.primary }]}>Soug XPRESS</Text>
                  <Text style={[styles.marketFooterText, { color: colors.textSecondary }]}>منصة تجارة محلية لمدينة عين الصفراء</Text>
                </View>
              </>;
            })()}
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
  heroListContent: {
    paddingHorizontal: HERO_LIST_PADDING,
  },
  heroSlide: {
    width: HERO_CARD_WIDTH,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: HERO_ITEM_MARGIN,
  },
  heroImageContainer: {
    width: "100%",
    height: 196,
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
