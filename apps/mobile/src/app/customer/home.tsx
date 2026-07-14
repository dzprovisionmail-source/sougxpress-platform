import React, { useState, useRef, useEffect } from "react";
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
  storeId: string;
  storeName: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "",
    title: "عروض الأسبوع",
    description: "خصومات حصرية على الخضروات والفواكه الطازجة",
    buttonLabel: "تسوق الآن",
    storeId: "5",
    storeName: "سوبر ماركت الوفاء",
  },
  {
    id: "2",
    image: "",
    title: "متجر جديد في السوق",
    description: "مخبزة السعادة تفتح أبوابها — خبز طازج يومياً",
    buttonLabel: "اكتشف المتجر",
    storeId: "2",
    storeName: "مخبزة السعادة",
  },
  {
    id: "3",
    image: "",
    title: "توصيل مجاني",
    description: "لأول طلب لك — يوصلك لبابك بدون رسوم",
    buttonLabel: "اطلب الآن",
    storeId: "1",
    storeName: "واحة عين صفراء",
  },
];

const CATEGORIES = [
  { id: "1", name: "خضروات", icon: "leaf-outline" as const },
  { id: "2", name: "فواكه", icon: "nutrition-outline" as const },
  { id: "3", name: "لحوم", icon: "restaurant-outline" as const },
  { id: "4", name: "مخبوزات", icon: "pizza-outline" as const },
  { id: "5", name: "ألبان", icon: "water-outline" as const },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .eq("status", "active")
        .limit(10);

      if (fetchError) throw fetchError;
      setStores(data || []);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError("حدث خطأ أثناء تحميل المتاجر");
    } finally {
      setLoading(false);
    }
  };

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item }: { item: HeroSlide }) => (
    <TouchableOpacity 
      style={[styles.heroSlide, { backgroundColor: colors.bgElevated }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: "/store-details", params: { id: item.storeId } })}
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
              }
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
            { backgroundColor: "rgba(0, 0, 0, 0.35)" }
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
          {item.storeName}
        </Typography>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      
      <MarketplaceHeader theme={theme} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Section */}
        <View style={styles.section}>
          <SearchBar 
            value={search} 
            onChangeText={setSearch} 
            onFilterPress={() => {}}
            onVoicePress={() => {}}
            theme={theme}
          />
        </View>

        {/* Hero Slider */}
        <View style={styles.section}>
          <FlatList
            ref={heroScrollRef}
            data={HERO_SLIDES}
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
            {HERO_SLIDES.map((_, index) => (
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
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            {CATEGORIES.map(cat => (
              <CategoryItem 
                key={cat.id} 
                name={cat.name} 
                icon={cat.icon} 
                theme={theme}
                isActive={activeCategory === cat.id}
                onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Featured Stores */}
        <View style={styles.section}>
          <SectionHeader title="محلات مميزة" onSeeAll={() => {}} theme={theme} />
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Typography variant="caption" color="error">{error}</Typography>
            </View>
          ) : stores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Typography variant="body" color="secondary">لا توجد متاجر متاحة حالياً</Typography>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.storesScroll, 
                { flexDirection: isRTL ? "row-reverse" : "row" }
              ]}
            >
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  id={store.id}
                  name={store.name}
                  category={store.category}
                  rating={store.rating?.toString() || "0.0"}
                  isOpen={store.status === 'active'}
                  theme={theme}
                  onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
                />
              ))}
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
});
