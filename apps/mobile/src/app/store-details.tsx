import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  RefreshControl,
  Image,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Typography,
  Header,
  ProductCard,
  SearchBar,
  EmptyState,
  ImageFallback,
  Avatar,
  Rating,
  Badge,
} from "@/components/ui";
import { Clock, MapPin, Tag, ShoppingBag, Store as StoreIcon } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function StoreDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [mediaTab, setMediaTab] = useState<"photos" | "videos">("photos");
  const [categories, setCategories] = useState<string[]>(["الكل"]);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStoreData();
    }
  }, [id]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      // Fetch store
      const { data: storeData, error: storeErr } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();

      if (storeErr) throw storeErr;
      setStore(storeData);

      // Fetch products
      const { data: prodsData, error: prodsErr } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id);

       if (prodsErr) throw prodsErr;
      setProducts(prodsData || []);

      // Fetch gallery (active images only)
      const { data: galleryData, error: galleryErr } = await supabase
        .from("store_gallery")
        .select("*")
        .eq("store_id", id)
        .eq("is_visible", true);

      if (galleryErr) console.error("Gallery fetch error:", galleryErr);
      setGallery(galleryData || []);

      // Extract unique categories
      const catsSet = new Set<string>();
      (prodsData || []).forEach((p) => {
        if (p.category) catsSet.add(p.category);
      });
      setCategories(["الكل", ...Array.from(catsSet)]);
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStoreData();
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "الكل" || p.category === selectedCategory;
      const matchesQuery =
        !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <Header title="المتجر غير موجود" />
        <EmptyState type="no-stores" description="تعذّر العثور على المتجر المطلوب" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title={store.name} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Cover Header */}
        <View style={styles.coverWrapper}>
          <ImageFallback
            uri={store.cover_url}
            type="cover"
            title={store.name}
            category={store.category}
            width="100%"
            height={160}
            borderRadius={TOKENS.radius.md}
          />
        </View>

        {/* Store Card Header Info */}
        <View style={[styles.storeCardInfo, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.avatarRow}>
            <Avatar uri={store.logo_url} name={store.name} type="store" size="lg" />
          </View>

          <Typography variant="h1" align="center" style={{ marginTop: TOKENS.spacing.xs }}>
            {store.name}
          </Typography>

          <Typography variant="caption" color="secondary" align="center" style={{ marginTop: 2 }}>
            {store.category || "متجر في عين صفراء"}
          </Typography>

          <View style={[styles.metaBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Rating rating={store.rating || 4.8} size="sm" showBadge />
            <Badge
              text={store.is_open !== false ? "مفتوح الآن" : "مغلق"}
              variant={store.is_open !== false ? "success" : "error"}
            />
          </View>

          {store.description ? (
            <Typography variant="body" color="secondary" align="center" style={styles.storeDesc}>
              {store.description}
            </Typography>
          ) : null}
        </View>

        {/* Media Section: Photos / Videos Tabs (above products) */}
        <View style={{ marginTop: TOKENS.spacing.lg, paddingHorizontal: TOKENS.spacing.md }}>
          <View style={{ flexDirection: "row-reverse", gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.sm }}>
            <TouchableOpacity
              onPress={() => setMediaTab("photos")}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderBottomWidth: mediaTab === "photos" ? 2 : 1,
                borderBottomColor: mediaTab === "photos" ? colors.primary : colors.borderSubtle,
              }}
            >
              <Typography
                variant="subtitle"
                style={{
                  fontWeight: mediaTab === "photos" ? "700" : "500",
                  color: mediaTab === "photos" ? colors.primary : colors.textSecondary,
                }}
              >
                صور
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMediaTab("videos")}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderBottomWidth: mediaTab === "videos" ? 2 : 1,
                borderBottomColor: mediaTab === "videos" ? colors.primary : colors.borderSubtle,
              }}
            >
              <Typography
                variant="subtitle"
                style={{
                  fontWeight: mediaTab === "videos" ? "700" : "500",
                  color: mediaTab === "videos" ? colors.primary : colors.textSecondary,
                }}
              >
                فيديو
              </Typography>
            </TouchableOpacity>
          </View>

          {/* Photos Tab Content */}
          {mediaTab === "photos" && (
            gallery.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}
              >
                {gallery.map((img) => (
                  <View key={img.id} style={{ alignItems: "center" }}>
                    <Image
                      source={{ uri: img.image_url }}
                      style={{ width: 100, height: 100, borderRadius: TOKENS.radius.sm, borderWidth: 1, borderColor: colors.borderSubtle }}
                      resizeMode="cover"
                    />
                    {img.caption ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "center", marginTop: 4, maxWidth: 100 }}>{img.caption}</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", padding: 16 }}>
                لا توجد صور في المعرض.
              </Text>
            )
          )}

          {/* Videos Tab Content */}
          {mediaTab === "videos" && (
            <View
              style={{
                width: "100%",
                height: 160,
                borderRadius: TOKENS.radius.md,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                backgroundColor: colors.bgElevated,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center" }}>
                لا توجد فيديوهات متاحة حالياً
              </Text>
            </View>
          )}
        </View>

        {/* Search Bar in Store */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`ابحث في منتجات ${store.name}...`}
          />
        </View>

        {/* Categories Bar */}
        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoriesScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {categories.map((cat) => {
              const active = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: active ? colors.primary : colors.bgSurface,
                      borderColor: active ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Typography
                    variant="caption"
                    style={{
                      color: active ? colors.textOnBrand : colors.textPrimary,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {cat}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            type="no-data"
            title="لا توجد منتجات مطابقة"
            description="جرب البحث باسم منتج آخر أو اختيار تصنيف مختلف"
          />
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((p) => (
              <View key={p.id} style={styles.productCardCol}>
                <ProductCard
                  id={p.id}
                  name={p.name}
                  price={p.price_minor ? p.price_minor / 100 : 0}
                  image={p.image_url}
                  storeName={store.name}
                  inStock={p.is_available !== false}
                  onPress={() =>
                    router.push({ pathname: "/product-details", params: { id: p.id } })
                  }
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    paddingBottom: TOKENS.spacing['3xl'],
  },
  coverWrapper: {
    width: "100%",
    paddingHorizontal: TOKENS.spacing.md,
  },
  storeCardInfo: {
    marginHorizontal: TOKENS.spacing.md,
    marginTop: -30,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    alignItems: "center",
    ...TOKENS.shadows.small,
  },
  avatarRow: {
    marginTop: -36,
  },
  metaBadgesRow: {
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.sm,
  },
  storeDesc: {
    marginTop: TOKENS.spacing.sm,
    lineHeight: 20,
  },
  searchSection: {
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.lg,
  },
  categoriesScroll: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
  },
  productsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    paddingHorizontal: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  productCardCol: {
    width: "48%",
  },
});
