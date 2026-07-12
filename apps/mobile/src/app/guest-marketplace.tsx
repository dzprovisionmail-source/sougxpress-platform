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
} from "react-native";
import { useRouter } from "expo-router";
import { 
  Typography, 
  SearchBar, 
  ProductCard, 
  CategoryItem, 
  SectionHeader, 
  BottomNavigation,
  MarketplaceHeader,
  Card
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
  store: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "",
    title: "عروض الأسبوع",
    description: "خصومات حصرية على الخضروات والفواكه الطازجة",
    buttonLabel: "تسوق الآن",
    store: "سوبر ماركت الوفاء",
  },
  {
    id: "2",
    image: "",
    title: "متجر جديد في السوق",
    description: "مخبزة السعادة تفتح أبوابها — خبز طازج يومياً",
    buttonLabel: "اكتشف المتجر",
    store: "مخبزة السعادة",
  },
  {
    id: "3",
    image: "",
    title: "توصيل مجاني",
    description: "لأول طلب لك — يوصلك لبابك بدون رسوم",
    buttonLabel: "اطلب الآن",
    store: "سوق إكسبريس",
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
}

const NEW_STORES: StoreItem[] = [
  { id: "1", name: "واحة عين صفراء", category: "مواد غذائية", rating: "4.7" },
  { id: "2", name: "مخبزة السعادة", category: "مخبوزات", rating: "4.9" },
  { id: "3", name: "ملحمة النور", category: "لحوم طازجة", rating: "4.8" },
  { id: "4", name: "بقالة الخير", category: "بقالة", rating: "4.5" },
];

const FEATURED_STORES: StoreItem[] = [
  { id: "5", name: "سوبر ماركت الوفاء", category: "مواد غذائية", rating: "4.8" },
  { id: "6", name: "حلويات الذوق الرفيع", category: "حلويات", rating: "4.6" },
  { id: "7", name: "خضروات السهبة", category: "خضروات", rating: "4.7" },
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
  const heroScrollRef = useRef<FlatList<HeroSlide>>(null);
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const renderHeroSlide = ({ item }: { item: HeroSlide }) => (
    <View style={[styles.heroSlide, { backgroundColor: colors.bgElevated }]}>
      {/* Image/Video Placeholder */}
      <View style={[styles.heroImagePlaceholder, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Typography variant="caption" color="disabled" align="center">
          صورة / فيديو
        </Typography>
      </View>

      {/* Slide Content */}
      <View style={styles.heroTextContent}>
        <Typography variant="h2" style={styles.heroTitle}>
          {item.title}
        </Typography>
        <Typography variant="body" color="secondary" numberOfLines={2}>
          {item.description}
        </Typography>
        <TouchableOpacity style={styles.heroActionBtn}>
          <Typography variant="button" style={styles.heroActionText}>
            {item.buttonLabel}
          </Typography>
        </TouchableOpacity>
        <Typography variant="caption" color="disabled" style={styles.heroStoreLabel}>
          {item.store}
        </Typography>
      </View>
    </View>
  );

  const renderStoreCard = (store: StoreItem, index: number) => (
    <Card
      key={store.id}
      variant="outline"
      theme={theme}
      style={styles.storeCard}
      onPress={() => router.push("/store-details")}
    >
      <View style={[styles.storeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.storeIcon, { backgroundColor: colors.bgSurface }]}>
          <Typography variant="h2" color="brand">
            {store.name[0]}
          </Typography>
        </View>
        <View style={styles.storeInfo}>
          <Typography variant="h3">{store.name}</Typography>
          <Typography variant="caption" color="secondary">{store.category}</Typography>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: colors.bgSurface }]}>
          <Typography variant="caption" style={{ color: TOKENS.colors.brandAccent }}>★ {store.rating}</Typography>
        </View>
      </View>
    </Card>
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
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: activeSlide === index ? TOKENS.colors.brandPrimary : colors.borderSubtle,
                  },
                ]}
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
              styles.horizontalScroll, 
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            {CATEGORIES.map(cat => (
              <CategoryItem key={cat.id} name={cat.name} icon={cat.icon} theme={theme} />
            ))}
          </ScrollView>
        </View>

        {/* New Stores — محلات جديدة */}
        <View style={styles.section}>
          <SectionHeader title="محلات جديدة" onSeeAll={() => {}} theme={theme} />
          {NEW_STORES.map((store, index) => renderStoreCard(store, index))}
        </View>

        {/* Featured Stores — محلات مميزة */}
        <View style={styles.section}>
          <SectionHeader title="محلات مميزة" onSeeAll={() => {}} theme={theme} />
          {FEATURED_STORES.map((store, index) => renderStoreCard(store, index))}
        </View>

        {/* Products Section — Below stores (not primary focus) */}
        <View style={styles.section}>
          <SectionHeader title="منتجات" onSeeAll={() => {}} theme={theme} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.horizontalScroll, 
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            <ProductCard 
              title="طماطم طازجة" 
              price="120 دج" 
              storeName="محل الخير"
              image=""
              theme={theme}
              onPress={() => router.push("/product-details")}
            />
            <ProductCard 
              title="خبز تقليدي" 
              price="10 دج" 
              storeName="مخبزة السعادة"
              image=""
              theme={theme}
              onPress={() => router.push("/product-details")}
            />
            <ProductCard 
              title="زيت زيتون" 
              price="850 دج" 
              storeName="واحة عين صفراء"
              image=""
              theme={theme}
              onPress={() => router.push("/product-details")}
            />
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
                <Typography variant="caption" color={theme === t ? "brand" : "secondary"}>
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
  horizontalScroll: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.sm,
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
  heroImagePlaceholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  heroTextContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.xs,
  },
  heroTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  heroActionBtn: {
    backgroundColor: TOKENS.colors.brandPrimary,
    borderRadius: TOKENS.radius.full,
    paddingVertical: TOKENS.spacing.xs,
    paddingHorizontal: TOKENS.spacing.md,
    alignSelf: "flex-start",
    marginTop: TOKENS.spacing.xs,
  },
  heroActionText: {
    color: TOKENS.colors.dark.textOnBrand,
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  storeCard: {
    marginHorizontal: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.md,
    padding: TOKENS.spacing.md,
  },
  storeRow: {
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  storeInfo: {
    flex: 1,
    gap: 2,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
