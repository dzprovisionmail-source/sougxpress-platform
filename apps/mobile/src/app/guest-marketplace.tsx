import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  I18nManager,
  TouchableOpacity
} from "react-native";
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

export default function GuestMarketplaceScreen() {
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  // Mock Data
  const categories = [
    { id: "1", name: "خضروات", icon: "leaf-outline" as const },
    { id: "2", name: "فواكه", icon: "nutrition-outline" as const },
    { id: "3", name: "لحوم", icon: "restaurant-outline" as const },
    { id: "4", name: "مخبوزات", icon: "pizza-outline" as const },
    { id: "5", name: "ألبان", icon: "water-outline" as const },
  ];

  const popularProducts = [
    { id: "1", title: "طماطم طازجة", price: "120 دج", store: "محل الخير", image: "" },
    { id: "2", title: "خبز تقليدي", price: "10 دج", store: "مخبزة السعادة", image: "" },
    { id: "3", title: "زيت زيتون", price: "850 دج", store: "واحة عين صفراء", image: "" },
  ];

  const featuredStores = [
    { id: "1", name: "سوبر ماركت الوفاء", category: "مواد غذائية", rating: "4.8" },
    { id: "2", name: "ملحمة النور", category: "لحوم طازجة", rating: "4.9" },
  ];

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

        {/* Hero Banner */}
        <View style={styles.section}>
          <Card variant="elevated" theme={theme} style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
            <View style={styles.heroContent}>
              <Typography variant="h1" style={{ color: colors.textOnBrand }}>
                توصيل سريع مجاني
              </Typography>
              <Typography variant="body" style={{ color: colors.textOnBrand, opacity: 0.9 }}>
                لأول طلب لك في عين صفراء
              </Typography>
              <TouchableOpacity style={[styles.heroButton, { backgroundColor: colors.bgBase }]}>
                <Typography variant="button" color="brand">اطلب الآن</Typography>
              </TouchableOpacity>
            </View>
          </Card>
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
            {categories.map(cat => (
              <CategoryItem key={cat.id} name={cat.name} icon={cat.icon} theme={theme} />
            ))}
          </ScrollView>
        </View>

        {/* Popular Products */}
        <View style={styles.section}>
          <SectionHeader title="منتجات شائعة" onSeeAll={() => {}} theme={theme} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.horizontalScroll, 
              { flexDirection: isRTL ? "row-reverse" : "row" }
            ]}
          >
            {popularProducts.map(prod => (
              <ProductCard 
                key={prod.id} 
                title={prod.title} 
                price={prod.price} 
                storeName={prod.store}
                image={prod.image}
                theme={theme}
              />
            ))}
          </ScrollView>
        </View>

        {/* Featured Stores */}
        <View style={styles.section}>
          <SectionHeader title="متاجر مميزة" onSeeAll={() => {}} theme={theme} />
          {featuredStores.map(store => (
            <Card key={store.id} variant="outline" theme={theme} style={styles.storeCard}>
              <View style={[styles.storeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.storeIcon, { backgroundColor: colors.bgSurface }]}>
                  <Typography variant="h2" color="brand">{store.name[0]}</Typography>
                </View>
                <View style={styles.storeInfo}>
                  <Typography variant="h3">{store.name}</Typography>
                  <Typography variant="caption" color="secondary">{store.category}</Typography>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: colors.bgSurface }]}>
                  <Typography variant="caption" style={{ color: colors.accent }}>★ {store.rating}</Typography>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Theme Toggle */}
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
                  {t.charAt(0).toUpperCase() + t.slice(1)}
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
  heroBanner: {
    marginHorizontal: TOKENS.spacing.lg,
    height: 160,
    justifyContent: "center",
    padding: TOKENS.spacing.xl,
  },
  heroContent: {
    gap: TOKENS.spacing.xs,
  },
  heroButton: {
    alignSelf: "flex-start",
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.full,
    marginTop: TOKENS.spacing.sm,
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
