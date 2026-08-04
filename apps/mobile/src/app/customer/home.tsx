import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  I18nManager,
  TouchableOpacity,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  SearchBar,
  CategoryItem,
  SectionHeader,
  MarketplaceHeader,
  StoreCard,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { MAIN_CATEGORIES, mapLegacyCategoryToMain, getArabicCategoryName } from "@/config/storeCategories";
import { getActiveCategories, getActiveSubcategories } from "@/services/category.service";
import { getAvailableCouriers } from "@/services/courierService";
import { Ionicons } from "@expo/vector-icons";

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

interface StoreRow {
  id: string;
  name: string;
  category: string;
  main_category?: string | null;
  sub_category?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  rating?: string;
  status: string;
  cover_url?: string;
  logo_url?: string;
  description?: string;
  address_line1?: string;
  city?: string;
  is_open?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  phone_number?: string;
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

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string; icon?: string; subtitle?: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  const [heroStores, setHeroStores] = useState<StoreRow[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(HERO_SLIDES_TEMPLATES);
  const [heroLoading, setHeroLoading] = useState(false);

  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const storesMap = useMemo(() => {
    const map = new Map<string, StoreRow>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

  useEffect(() => {
    fetchStores();
    loadCategories();
    fetchHeroContent();
  }, []);

  const loadCategories = async () => {
    const cats = await getActiveCategories();
    setCategories([
      ...cats,
      {
        id: "couriers",
        name_ar: "🛵 الموصلون",
        icon: "bicycle-outline",
        subtitle: "الموصلون المتاحون",
      },
    ]);
  };

  const handleCategoryPress = async (catId: string) => {
    setActiveCategory(catId);
    setActiveSubcategory("all");
    if (catId === "all" || catId === "couriers") {
      setSubcategories([]);
    } else {
      const subs = await getActiveSubcategories(catId);
      setSubcategories(subs);
    }
  };

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let { data, error: fetchError } = await supabase
        .from("stores")
        .select("id, name, category, main_category, rating, status, cover_url, logo_url, description, address_line1, city, is_open, is_featured, is_new, phone_number")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError && (fetchError.code === '42703' || fetchError.message?.includes('main_category'))) {
        const fallback = await supabase
          .from("stores")
          .select("id, name, category, rating, status, cover_url, logo_url, description, address_line1, city, is_open, is_featured, is_new, phone_number")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(20);
        data = (fallback.data || []).map(s => ({ ...s, main_category: mapLegacyCategoryToMain(s.category) })) as any;
        fetchError = fallback.error;
      }

      if (fetchError) throw fetchError;
      const storesData = ((data as StoreRow[]) || []).map(s => ({
        ...s,
        main_category: s.main_category || mapLegacyCategoryToMain(s.category)
      }));
      setStores(storesData);
      setHeroStores(storesData.slice(0, 3));
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError("حدث خطأ أثناء تحميل المتاجر");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStores();
  }, [fetchStores]);

  const fetchHeroContent = useCallback(async () => {
    setHeroLoading(true);
    try {
      const now = new Date().toISOString();

      const [alertsRes, promotionsRes, newStoresRes, newProductsRes, couriersRes] = await Promise.all([
        supabase
          .from("founder_alerts")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("store_promotions")
          .select("*")
          .eq("is_active", true)
          .gte("starts_at", now)
          .lte("ends_at", now)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("stores")
          .select("id, name, description, cover_url")
          .eq("status", "active")
          .eq("is_new", true)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("products")
          .select("id, name, description, image_url, store_id, stores(name)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("couriers")
          .select("id, full_name, rating, vehicle_type, avatar_url")
          .or("is_available.eq.true,is_mock.eq.true")
          .order("rating", { ascending: false })
          .limit(3),
      ]);

      let slides: HeroSlide[] = [];

      if (!alertsRes.error && alertsRes.data && alertsRes.data.length > 0) {
        slides = alertsRes.data.map((alert) => ({
          id: `alert-${alert.id}`,
          image: "",
          title: alert.message,
          description: alert.category,
          buttonLabel: "عرض التفاصيل",
          kind: "alert",
        }));
      } else {
        const allPromotions = promotionsRes.data || [];
        const flashOffers = allPromotions.filter(
          (p) => p.discount_type === "percentage" && p.discount_value >= 20
        );
        const otherPromotions = allPromotions.filter(
          (p) => !(p.discount_type === "percentage" && p.discount_value >= 20)
        );

        const candidatePromotions =
          flashOffers.length > 0 ? flashOffers : otherPromotions;

        if (candidatePromotions.length > 0 && !promotionsRes.error) {
          slides = candidatePromotions.map((p) => ({
            id: `promo-${p.id}`,
            image: p.image_url || "",
            title: flashOffers.length > 0 ? `🔥 ${p.title}` : p.title,
            description: p.description || `خصم ${p.discount_value}${p.discount_type === "percentage" ? "%" : p.discount_type === "free_delivery" ? " توصيل مجاني" : " د.ج"}`,
            buttonLabel: flashOffers.length > 0 ? "استفد الآن" : "تسوق الآن",
            storeId: p.store_id,
            kind: flashOffers.length > 0 ? "flash" : "promotion",
          }));
        } else if (!newStoresRes.error && newStoresRes.data && newStoresRes.data.length > 0) {
          slides = newStoresRes.data.map((s) => ({
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
          slides = newProductsRes.data.map((p) => ({
            id: `product-${p.id}`,
            image: p.image_url || "",
            title: p.name,
            description: p.description || "منتج جديد",
            buttonLabel: "عرض المنتج",
            storeId: p.store_id,
            storeName: p.stores?.name,
            kind: "product",
          }));
        } else if (!couriersRes.error && couriersRes.data && couriersRes.data.length > 0) {
          slides = couriersRes.data.map((c) => ({
            id: `courier-${c.id}`,
            image: c.avatar_url || "",
            title: c.full_name,
            description: `⭐ ${c.rating} • ${c.vehicle_type}`,
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

  const filteredStores = useMemo(() => {
    let result = stores;

    if (activeCategory !== "all") {
      result = result.filter(
        (store) => store.main_category === activeCategory || store.category === activeCategory || store.category_id === activeCategory
      );
    }

    if (activeSubcategory !== "all") {
      result = result.filter(
        (store) => store.subcategory_id === activeSubcategory || store.sub_category === activeSubcategory
      );
    }

    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (store) =>
          store.name.toLowerCase().includes(q) ||
          (store.category && store.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [stores, activeCategory, activeSubcategory, search]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item, index }: { item: HeroSlide; index: number }) => {
    const heroStore = item.storeId ? storesMap.get(item.storeId) : heroStores[index];
    const hasStore = !!heroStore || !!item.storeId;

    const handlePress = () => {
      if (item.kind === "courier") {
        const courierId = item.id.replace("courier-", "");
        router.push(`/courier/${courierId}`);
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
        activeOpacity={hasStore ? 0.8 : 1}
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
        <Typography
          variant="h2"
          align="right"
          style={[styles.heroTitle, { color: colors.primary }]}
        >
          {item.title}
        </Typography>
        <Typography
          variant="body"
          color="secondary"
          numberOfLines={2}
          align="right"
        >
          {item.description}
        </Typography>
        <TouchableOpacity
          style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
        >
          <Typography
            variant="button"
            align="center"
            style={[styles.heroActionText, { color: colors.textOnBrand }]}
          >
            {item.buttonLabel}
          </Typography>
        </TouchableOpacity>
        <Typography
          variant="caption"
          color="disabled"
          align="right"
          style={styles.heroStoreLabel}
        >
          {heroStore ? heroStore.name : item.storeName || HERO_STORE_TITLES[index] || ""}
        </Typography>
      </View>
    </TouchableOpacity>
    );
  };

  const renderStoreItem = useCallback(
    (store: StoreRow) => (
      <StoreCard
        key={store.id}
        id={store.id}
        name={store.name}
        category={getArabicCategoryName(store.category)}
        subcategory={store.sub_category}
        rating={store.rating?.toString() || "0.0"}
        coverImage={store.cover_url}
        logoImage={store.logo_url}
        isOpen={store.is_open ?? store.status === "active"}
        isFeatured={store.is_featured}
        address={store.address_line1 ?? store.city ?? ""}
        onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
      />
    ),
    [router]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      <MarketplaceHeader theme={theme} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Search Section */}
        <View style={styles.section}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن متاجر أو منتجات في عين صفراء..."
            onClear={() => setSearch("")}
            style={{ marginHorizontal: TOKENS.spacing.lg }}
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

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader title="التصنيفات" onSeeAll={() => {}} theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.categoriesScroll,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <CategoryItem
              key="all"
              name="الكل"
              icon="apps-outline"
              theme={theme}
              isActive={activeCategory === "all"}
              onPress={() => handleCategoryPress("all")}
            />
            {categories.map((cat) => {
              if (cat.id === "couriers") {
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleCategoryPress("couriers")}
                    style={[
                      styles.courierCategoryItem,
                      {
                        backgroundColor: activeCategory === cat.id ? colors.primary : colors.bgSurface,
                        borderColor: activeCategory === cat.id ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={(cat.icon as any) || "bicycle-outline"}
                      size={18}
                      color={activeCategory === cat.id ? colors.textOnBrand : colors.primary}
                    />
                    <View style={styles.courierCategoryText}>
                      <Typography
                        variant="caption"
                        align="center"
                        style={{
                          color: activeCategory === cat.id ? colors.textOnBrand : colors.textPrimary,
                          fontWeight: "600",
                        }}
                      >
                        {cat.name_ar}
                      </Typography>
                      {(cat as any).subtitle ? (
                        <Typography
                          variant="caption"
                          align="center"
                          style={{
                            color: activeCategory === cat.id ? colors.textOnBrand : colors.textSecondary,
                            fontSize: 10,
                          }}
                        >
                          {(cat as any).subtitle}
                        </Typography>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }
              return (
                <CategoryItem
                  key={cat.id}
                  name={cat.name_ar}
                  icon={(cat.icon || "storefront-outline") as any}
                  theme={theme}
                  isActive={activeCategory === cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <View style={styles.section}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoriesScroll,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <CategoryItem
                key="all-sub"
                name="الكل"
                icon="apps-outline"
                theme={theme}
                isActive={activeSubcategory === "all"}
                onPress={() => setActiveSubcategory("all")}
              />
              {subcategories.map((sub) => (
                <CategoryItem
                  key={sub.id}
                  name={sub.name_ar}
                  icon="storefront-outline"
                  theme={theme}
                  isActive={activeSubcategory === sub.id}
                  onPress={() => setActiveSubcategory(sub.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Stores */}
        <View style={styles.section}>
          <SectionHeader
            title={search.trim() ? "نتائج البحث" : "محلات مميزة"}
            onSeeAll={() => {}}
            theme={theme}
          />
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Typography variant="caption" color="secondary" style={{ marginTop: 8 }}>
                جاري تحميل المتاجر...
              </Typography>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Typography variant="body" color="error">{error}</Typography>
              <TouchableOpacity onPress={fetchStores} style={{ marginTop: 12 }}>
                <Typography variant="caption" color="primary">إعادة المحاولة</Typography>
              </TouchableOpacity>
            </View>
          ) : filteredStores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Typography variant="body" color="secondary">
                {search.trim() ? "لا توجد نتائج مطابقة للبحث" : "لا توجد متاجر متاحة حالياً"}
              </Typography>
              {search.trim().length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={{ marginTop: 8 }}>
                  <Typography variant="caption" color="primary">مسح البحث</Typography>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.storesScroll,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              {filteredStores.map(renderStoreItem)}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Bottom padding for tabs
  },
  section: {
    marginTop: TOKENS.spacing.md,
  },
  categoriesScroll: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.sm,
    gap: TOKENS.spacing.sm,
  },
  courierCategoryItem: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    marginRight: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  courierCategoryText: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  storesScroll: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.sm,
    gap: TOKENS.spacing.sm,
  },
  heroListContent: {
    paddingHorizontal: TOKENS.spacing.md,
  },
  heroSlide: {
    width: SCREEN_WIDTH - TOKENS.spacing.lg * 2,
    borderRadius: TOKENS.radius.lg,
    overflow: "hidden",
    marginHorizontal: TOKENS.spacing.xs,
  },
  heroImageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  heroTextContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.xs,
  },
  heroTitle: {
    fontWeight: "700",
  },
  heroActionBtn: {
    borderRadius: TOKENS.radius.full,
    paddingVertical: TOKENS.spacing.xs,
    paddingHorizontal: TOKENS.spacing.md,
    alignSelf: "flex-start",
    marginTop: TOKENS.spacing.xs,
  },
  heroActionText: {
    fontWeight: "600",
  },
  heroStoreLabel: {
    marginTop: TOKENS.spacing.xs,
  },
  dotsContainer: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: TOKENS.spacing.sm,
    gap: TOKENS.spacing.xs,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    padding: TOKENS.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: TOKENS.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
});
