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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
}

interface StoreRow {
  id: string;
  name: string;
  category: string;
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

const CATEGORIES = [
  { id: "all", name: "الكل", icon: "apps-outline" as const },
  { id: "خضروات", name: "خضروات", icon: "leaf-outline" as const },
  { id: "فواكه", name: "فواكه", icon: "nutrition-outline" as const },
  { id: "لحوم", name: "لحوم", icon: "restaurant-outline" as const },
  { id: "مخبوزات", name: "مخبوزات", icon: "pizza-outline" as const },
  { id: "ألبان", name: "ألبان", icon: "water-outline" as const },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  const [heroStores, setHeroStores] = useState<StoreRow[]>([]);

  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("id, name, category, rating, status, cover_url, logo_url, description, address_line1, city, is_open, is_featured, is_new, phone_number")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      const stores = (data as StoreRow[]) || [];
      setStores(stores);
      setHeroStores(stores.slice(0, 3));
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

  const filteredStores = useMemo(() => {
    let result = stores;

    if (activeCategory !== "all") {
      result = result.filter((store) => store.category === activeCategory);
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
  }, [stores, activeCategory, search]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item, index }: { item: HeroSlide; index: number }) => {
    const heroStore = heroStores[index];
    const hasStore = !!heroStore;
    return (
      <TouchableOpacity
        style={[styles.heroSlide, { backgroundColor: colors.bgElevated }]}
        activeOpacity={hasStore ? 0.8 : 1}
        onPress={() => {
          if (hasStore) {
            router.push({ pathname: "/store-details", params: { id: heroStore.id } });
          }
        }}
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
        category={store.category}
        rating={store.rating?.toString() || "0.0"}
        coverImage={store.cover_url}
        isOpen={store.is_open ?? store.status === "active"}
        isFeatured={store.is_featured}
        address={store.address_line1 ?? store.city ?? ""}
        theme={theme}
        onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
      />
    ),
    [router, theme]
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
          <View
            style={[
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                marginHorizontal: TOKENS.spacing.lg,
                borderRadius: TOKENS.radius.full,
                borderWidth: 1,
                paddingHorizontal: TOKENS.spacing.md,
                height: 48,
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="بحث عن متاجر أو منتجات..."
              placeholderTextColor={colors.textDisabled}
              style={[
                {
                  flex: 1,
                  fontSize: 15,
                  paddingVertical: 0,
                  color: colors.textPrimary,
                  fontFamily: TOKENS.typography?.families?.arabic || undefined,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Typography variant="caption" color="secondary">
                  ✕
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hero Slider */}
        <View style={styles.section}>
          <FlatList
            ref={heroScrollRef}
            data={HERO_SLIDES_TEMPLATES}
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
            {HERO_SLIDES_TEMPLATES.map((_, index) => (
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
            {CATEGORIES.map((cat) => (
              <CategoryItem
                key={cat.id}
                name={cat.name}
                icon={cat.icon}
                theme={theme}
                isActive={activeCategory === cat.id}
                onPress={() => setActiveCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

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
