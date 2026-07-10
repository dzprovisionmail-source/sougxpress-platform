import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  TouchableOpacity, 
  I18nManager,
  StatusBar
} from "react-native";
import { 
  Typography, 
  SearchBar, 
  ProductCard, 
  SectionHeader, 
  Badge,
  Card
} from "../components/ui";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function StoreDetailsScreen() {
  const router = useRouter();
  const [theme] = useState<ThemeType>(DEFAULT_THEME);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  // Mock Data
  const store = {
    name: "سوبر ماركت الوفاء",
    description: "أفضل المنتجات الطازجة والمواد الغذائية في عين صفراء. جودة عالية وتوصيل سريع لباب منزلك.",
    rating: "4.8",
    deliveryTime: "25-35 دقيقة",
    deliveryFee: "150 دج",
    coverImage: "https://via.placeholder.com/800x400",
    logo: "https://via.placeholder.com/100",
    categories: [
      { id: "all", name: "الكل" },
      { id: "veg", name: "خضروات" },
      { id: "fruit", name: "فواكه" },
      { id: "dairy", name: "ألبان" },
    ]
  };

  const products = [
    { id: "1", title: "طماطم طازجة", price: "120 دج", image: "" },
    { id: "2", title: "حليب الصومام", price: "95 دج", image: "" },
    { id: "3", title: "تفاح محلي", price: "250 دج", image: "" },
    { id: "4", title: "زيت عافية", price: "650 دج", image: "" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover & Header Actions */}
        <View style={styles.headerContainer}>
          <Image source={{ uri: store.coverImage }} style={styles.coverImage} />
          <View style={[styles.headerOverlay, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={[styles.iconButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="white" />
            </TouchableOpacity>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: TOKENS.spacing.sm }}>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                <Ionicons name="heart-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.storeInfoSection}>
          <View style={[styles.logoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.logoContainer, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Typography variant="h1" color="brand">{store.name[0]}</Typography>
            </View>
            <View style={[styles.titleContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Typography variant="h1">{store.name}</Typography>
              <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="caption" style={{ color: colors.accent }}>★ {store.rating}</Typography>
                <Typography variant="caption" color="disabled"> • </Typography>
                <Typography variant="caption" color="secondary">{store.deliveryTime}</Typography>
                <Typography variant="caption" color="disabled"> • </Typography>
                <Typography variant="caption" color="secondary">{store.deliveryFee}</Typography>
              </View>
            </View>
          </View>
          
          <Typography variant="body" color="secondary" style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>
            {store.description}
          </Typography>
        </View>

        {/* Search inside Store */}
        <View style={styles.searchSection}>
          <SearchBar 
            value={search} 
            onChangeText={setSearch} 
            placeholder="ابحث في المتجر..."
            theme={theme}
          />
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.categoryTabs, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {store.categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              onPress={() => setActiveCategory(cat.id)}
              style={[
                styles.tabButton, 
                activeCategory === cat.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
              ]}
            >
              <Typography 
                variant="button" 
                color={activeCategory === cat.id ? "brand" : "secondary"}
              >
                {cat.name}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <SectionHeader title="المنتجات" theme={theme} />
          <View style={[styles.productsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {products.map(prod => (
              <ProductCard 
                key={prod.id} 
                title={prod.title} 
                price={prod.price} 
                image={prod.image}
                theme={theme}
                onPress={() => router.push("/product-details")}
                style={styles.gridProduct}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: TOKENS.spacing.lg,
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  storeInfoSection: {
    padding: TOKENS.spacing.lg,
    marginTop: -30,
    backgroundColor: "transparent",
  },
  logoRow: {
    alignItems: "flex-end",
    gap: TOKENS.spacing.md,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    ...TOKENS.shadows.premium,
  },
  titleContainer: {
    flex: 1,
    paddingBottom: TOKENS.spacing.xs,
  },
  statsRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  description: {
    marginTop: TOKENS.spacing.md,
    lineHeight: 20,
  },
  searchSection: {
    paddingHorizontal: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.md,
  },
  categoryTabs: {
    paddingHorizontal: TOKENS.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginBottom: TOKENS.spacing.md,
  },
  tabButton: {
    paddingVertical: TOKENS.spacing.md,
    marginRight: TOKENS.spacing.lg,
  },
  productsSection: {
    paddingBottom: TOKENS.spacing.xl,
  },
  productsGrid: {
    flexWrap: "wrap",
    paddingHorizontal: TOKENS.spacing.lg,
    justifyContent: "space-between",
  },
  gridProduct: {
    width: "48%",
    marginRight: 0,
    marginBottom: TOKENS.spacing.md,
  }
});
