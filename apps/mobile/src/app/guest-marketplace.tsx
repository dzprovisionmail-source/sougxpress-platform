import React, { useState, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Hero Slider Sample Data — UI-only, temporary local data
 * Later controlled by admin dashboard.
 */
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

/**
 * Store Data — UI-only, temporary local data
 */
interface StoreItem {
  id: string;
  name: string;
  category: string;
  rating: string;
  deliveryTime?: string;
  coverImage?: string;
  isOpen?: boolean;
  isFeatured?: boolean;
}

const NEW_STORES: StoreItem[] = [
  { 
    id: "1", 
    name: "واحة عين صفراء", 
    category: "مواد غذائية", 
    rating: "4.7",
    deliveryTime: "25-35 دقيقة",
    isOpen: true,
    isFeatured: false,
  },
  { 
    id: "2", 
    name: "مخبزة السعادة", 
    category: "مخبوزات", 
    rating: "4.9",
    deliveryTime: "15-25 دقيقة",
    isOpen: true,
    isFeatured: false,
  },
  { 
    id: "3", 
    name: "ملحمة النور", 
    category: "لحوم طازجة", 
    rating: "4.8",
    deliveryTime: "30-40 دقيقة",
    isOpen: true,
    isFeatured: false,
  },
  { 
    id: "4", 
    name: "بقالة الخير", 
    category: "بقالة", 
    rating: "4.5",
    deliveryTime: "20-30 دقيقة",
    isOpen: false,
    isFeatured: false,
  },
];

const FEATURED_STORES: StoreItem[] = [
  { 
    id: "5", 
    name: "سوبر ماركت الوفاء", 
    category: "مواد غذائية", 
    rating: "4.8",
    deliveryTime: "20-30 دقيقة",
    isOpen: true,
    isFeatured: true,
  },
  { 
    id: "6", 
    name: "حلويات الذوق الرفيع", 
    category: "حلويات", 
    rating: "4.6",
    deliveryTime: "30-40 دقيقة",
    isOpen: true,
    isFeatured: true,
  },
  { 
    id: "7", 
    name: "خضروات السهبة", 
    category: "خضروات", 
    rating: "4.7",
    deliveryTime: "25-35 دقيقة",
    isOpen: true,
    isFeatured: true,
  },
];

const CATEGORIES = [
  { id: "1", name: "خضروات", icon: "leaf-outline" as const },
  { id: "2", name: "فواكه", icon: "nutrition-outline" as const },
  { id: "3", name: "لحوم", icon: "restaurant-outline" as const },
  { id: "4", name: "مخبوزات", icon: "pizza-outline" as const },
  { id: "5", name: "ألبان", icon: "water-outline" as const },
];

export default function GuestMarketplaceScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item }: { item: HeroSlide }) => (
    <TouchableOpacity 
      style={[styles.heroSlide, { backgroundColor: colors.bgElevated }]}
      activeOpacity={0.8}
      onPress={() => router.push("/store-details")}
    >
      {/* Cover Image with Branded Placeholder */}
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
            <Typography variant="caption" color="secondary">
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

      {/* Slide Content — Right-aligned for Arabic RTL */}
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
          {/* Dots Indicator */}
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

        {/* Featured Stores — محلات مميزة */}
        <View style={styles.section}>
          <SectionHeader title="محلات مميزة" onSeeAll={() => {}} theme={theme} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.storesScroll, 
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            {FEATURED_STORES.map((store) => (
              <StoreCard
                key={store.id}
                {...store}
                theme={theme}
                onPress={() => router.push("/store-details")}
              />
            ))}
          </ScrollView>
        </View>

        {/* New Stores — جميع المحلات / محلات جديدة */}
        <View style={styles.section}>
          <SectionHeader title="محلات جديدة" onSeeAll={() => {}} theme={theme} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.storesScroll, 
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            {NEW_STORES.map((store) => (
              <StoreCard
                key={store.id}
                {...store}
                theme={theme}
                onPress={() => router.push("/store-details")}
              />
            ))}
          </ScrollView>
        </View>

        {/* Theme Toggle — Keep for demo */}
        <View style={[styles.section, styles.themeToggle]}>
          <Typography variant="caption" color="secondary" align="center">تغيير المظهر للتجربة:</Typography>
          <View style={styles.themeButtons}>
            {(["dark", "light", "ivory"] as ThemeType[]).map((t) => (
              <TouchableOpacity 
                key={t}
                onPress={() => setTheme(t)} 
                style={[
                  styles.themeBtn, 
                  { borderColor: colors.borderSubtle },
                  theme === t && { borderColor: colors.primary, backgroundColor: colors.bgSurface }
                ]}
              >
                <Typography variant="caption" color={theme === t ? "brand" : "secondary"} align="center">
                  {t === "dark" ? "داكن" : t === "light" ? "فاتح" : "عاجي"}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabPress={setActiveTab} 
        theme={theme} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: TOKENS.spacing.xl,
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
  themeToggle: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.sm,
  },
  themeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: TOKENS.spacing.md,
  },
  themeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  }
});
