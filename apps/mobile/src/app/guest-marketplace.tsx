import React, { useState, useRef, useCallback } from "react";
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
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Typography,
  SearchBar,
  CategoryItem,
  SectionHeader,
  BottomNavigation,
  MarketplaceHeader,
  StoreCard,
} from "../components/ui";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../constants/theme";
import { supabase } from "../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StoreItem {
  id: string;
  name: string;
  category: string;
  rating?: string;
  cover_url?: string;
  logo_url?: string;
  description?: string;
  address_line1?: string;
  city?: string;
  is_open?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  status: string;
}

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId: string;
  storeName: string;
}

const CATEGORIES = [
  { id: "all", name: "الكل", icon: "apps-outline" as const },
  { id: "خضروات", name: "خضروات", icon: "leaf-outline" as const },
  { id: "فواكه", name: "فواكه", icon: "nutrition-outline" as const },
  { id: "لحوم", name: "لحوم", icon: "restaurant-outline" as const },
  { id: "مخبوزات", name: "مخبوزات", icon: "pizza-outline" as const },
  { id: "ألبان", name: "ألبان", icon: "water-outline" as const },
];

export default function GuestMarketplaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const isPreview = params.preview === "1";
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [heroStores, setHeroStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("id, name, category, rating, status, cover_url, logo_url, description, address_line1, city, is_open, is_featured")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      const items = (data as StoreItem[]) || [];
      setStores(items);
      setHeroStores(items.slice(0, 3));
    } catch (err: any) {
      console.error("Guest marketplace fetch error:", err);
      setError(err?.message || "حدث خطأ أثناء تحميل المتاجر");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filteredStores = React.useMemo(() => {
    let result = stores;
    if (activeCategory !== "all") {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          (s.address_line1 && s.address_line1.toLowerCase().includes(q)) ||
          (s.city && s.city.toLowerCase().includes(q))
      );
    }
    return result;
  }, [stores, activeCategory, search]);

  const featuredStores = React.useMemo(
    () => stores.filter((s) => s.is_featured),
    [stores]
  );

  const newStores = React.useMemo(
    () => stores.filter((s) => s.is_new).slice(0, 10),
    [stores]
  );

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
          {heroStore?.cover_url ? (
            <Image
              source={{ uri: heroStore.cover_url }}
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
              <Typography variant="caption" color="secondary">
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
            color="secondary"
            align="right"
            style={styles.heroStoreLabel}
          >
            {heroStore ? heroStore.name : item.storeName}
          </Typography>
        </View>
      </TouchableOpacity>
    );
  };

  const heroSlides: HeroSlide[] = React.useMemo(
    () => [
      {
        id: "1",
        title: "عروض الأسبوع",
        description: "خصومات حصرية على المتاجر المميزة في السوق",
        buttonLabel: "تسوق الآن",
        storeId: heroStores[0]?.id || "",
        storeName: heroStores[0]?.name || "",
      },
      {
        id: "2",
        title: "متاجر جديدة",
        description: "اكتشف أحدث المتاجر التي انضمت إلى المنصة",
        buttonLabel: "اكتشف",
        storeId: heroStores[1]?.id || "",
        storeName: heroStores[1]?.name || "",
      },
      {
        id: "3",
        title: "توصيل سريع",
        description: "اطلب الآن واستمتع بالتوصيل لبابك",
        buttonLabel: "اطلب الآن",
        storeId: heroStores[2]?.id || "",
        storeName: heroStores[2]?.name || "",
      },
    ],
    [heroStores]
  );

  const renderStoreCard = useCallback(
    (store: StoreItem) => (
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
        onPress={() =>
          router.push({ pathname: "/store-details", params: { id: store.id } })
        }
      />
    ),
    [router, theme]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {isPreview && (
        <View style={[styles.previewBanner, { backgroundColor: colors.primary }]}>
          <Typography variant="caption" style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            معاينة السوق كزائر — اضغط للعودة إلى لوحة المؤسس
          </Typography>
          <TouchableOpacity onPress={() => router.back()} style={styles.previewBackBtn}>
            <Typography variant="caption" style={{ color: "#fff", fontWeight: "700" }}>
              عودة →
            </Typography>
          </TouchableOpacity>
        </View>
      )}

      <MarketplaceHeader theme={theme} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && !error}
            onRefresh={fetchStores}
            tintColor={colors.primary}
          />
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
          {heroStores.length > 0 && (
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
          )}
          {heroStores.length > 0 && (
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
          )}
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
                onPress={() => setActiveCategory(activeCategory === cat.id ? "all" : cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Featured Stores */}
        {featuredStores.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="محلات مميزة" onSeeAll={() => {}} theme={theme} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.storesScroll,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              {featuredStores.map((store) => renderStoreCard(store))}
            </ScrollView>
          </View>
        )}

        {/* New Stores */}
        {newStores.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="محلات جديدة" onSeeAll={() => {}} theme={theme} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.storesScroll,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              {newStores.map((store) => renderStoreCard(store))}
            </ScrollView>
          </View>
        )}

        {/* All Active Stores */}
        <View style={styles.section}>
          <SectionHeader title="جميع المتاجر" onSeeAll={() => {}} theme={theme} />
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
            </View>
          ) : (
            <View>
              {filteredStores.map((store) => (
                <View key={store.id} style={{ marginBottom: TOKENS.spacing.sm }}>
                  {renderStoreCard(store)}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation
        activeTab={activeTab}
        onTabPress={(tab) => {
          if (tab === "home") {
            setActiveTab("home");
          } else if (tab === "search") {
            setActiveTab("search");
          } else if (tab === "orders") {
            router.push("/cart" as any);
          } else if (tab === "profile") {
            setActiveTab("profile");
          }
        }}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  previewBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewBackBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom nav
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
  loadingContainer: {
    padding: TOKENS.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: TOKENS.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
});
