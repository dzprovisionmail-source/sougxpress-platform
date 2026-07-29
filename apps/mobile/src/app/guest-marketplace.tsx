import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  MarketplaceHeader,
  SearchBar,
  StoreCard,
  ProductCard,
  CategoryIcon,
  EmptyState,
  Button,
} from "@/components/ui";
import { LogIn, Sparkles, ShoppingBag } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { MAIN_CATEGORIES } from "@/config/storeCategories";

export default function GuestMarketplaceScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGuestData();
  }, []);

  const fetchGuestData = async () => {
    try {
      setLoading(true);

      // Fetch active stores
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      setStores(storeData || []);

      // Fetch featured products
      const { data: prodData } = await supabase
        .from("products")
        .select(`
          *,
          stores ( name )
        `)
        .limit(10);

      setProducts(prodData || []);
    } catch (err) {
      console.error("Error fetching guest marketplace data:", err);
    } finally {      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGuestData();
  };

  // Filter stores
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchesCat =
        selectedCategory === "all" ||
        s.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [stores, selectedCategory, searchQuery]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <MarketplaceHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Login Banner Conversion Card */}
        <View style={[styles.loginBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
          <View style={[styles.loginRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.loginTextCol}>
              <Typography variant="h3" align="right" color="brand">
                مرحباً بك في سوق عين صفراء!
              </Typography>
              <Typography variant="caption" color="secondary" align="right" style={{ marginTop: 2 }}>
                سجّل الدخول للطلب وحفظ مفضلتك ومتابعة التوصيل مباشرة
              </Typography>
            </View>
            <Button
              title="تسجيل الدخول"
              onPress={() => router.push("/login")}
              size="sm"
              variant="primary"
              icon={<LogIn size={16} color={colors.textOnBrand} />}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث عن متجر أو منتج في عين صفراء..."
          />
        </View>

        {/* Horizontal Category List */}
        <View style={styles.categoriesSection}>
          <Typography variant="h3" align="right" style={{ marginBottom: TOKENS.spacing.sm }}>
            التصنيفات المتاحة
          </Typography>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoryScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory("all")}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: selectedCategory === "all" ? colors.primary : colors.bgElevated,
                  borderColor: selectedCategory === "all" ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              <CategoryIcon category="الكل" size="sm" variant={selectedCategory === "all" ? "filled" : "subtle"} />
              <Typography
                variant="caption"
                style={{
                  color: selectedCategory === "all" ? colors.textOnBrand : colors.textPrimary,
                  fontWeight: selectedCategory === "all" ? "700" : "500",
                }}
              >
                الكل
              </Typography>
            </TouchableOpacity>

            {MAIN_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: active ? colors.primary : colors.bgElevated,
                      borderColor: active ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <CategoryIcon category={cat.arabicName} size="sm" variant={active ? "filled" : "subtle"} />
                  <Typography
                    variant="caption"
                    style={{
                      color: active ? colors.textOnBrand : colors.textPrimary,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {cat.arabicName}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Featured Stores */}
        <View style={styles.sectionContainer}>
          <Typography variant="h2" align="right" style={{ marginBottom: TOKENS.spacing.md }}>
            متاجر عين صفراء
          </Typography>

          {filteredStores.length === 0 ? (
            <EmptyState
              type="no-stores"
              title="لم نجد متاجر مطابقة"
              description="حاول البحث بكلمة مختلفة أو اختر تصنيفاً آخر"
            />
          ) : (
            filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                category={store.category || "متجر"}
                coverImage={store.cover_url}
                logoImage={store.logo_url}
                rating={store.rating || 4.8}
                address={store.city || "عين صفراء"}
                isOpen={store.is_open !== false}
                onPress={() =>
                  router.push({ pathname: "/store-details", params: { id: store.id } })
                }
              />
            ))
          )}
        </View>

        {/* Featured Products */}
        {products.length > 0 && (
          <View style={styles.sectionContainer}>
            <Typography variant="h2" align="right" style={{ marginBottom: TOKENS.spacing.md }}>
              منتجات شائعة
            </Typography>

            <View style={styles.productsGrid}>
              {products.map((product) => (
                <View key={product.id} style={styles.productCol}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price_minor ? product.price_minor / 100 : 0}
                    image={product.image_url}
                    storeName={product.stores?.name}
                    onPress={() =>
                      router.push({ pathname: "/product-details", params: { id: product.id } })
                    }
                  />
                </View>
              ))}
            </View>
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
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing['3xl'],
  },
  loginBanner: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginTop: TOKENS.spacing.sm,
  },
  loginRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: TOKENS.spacing.md,
  },
  loginTextCol: {
    flex: 1,
  },
  searchSection: {
    marginTop: TOKENS.spacing.md,
  },
  categoriesSection: {
    marginTop: TOKENS.spacing.lg,
  },
  categoryScroll: {
    gap: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
  },
  categoryCard: {
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    gap: 4,
    minWidth: 80,
  },
  sectionContainer: {
    marginTop: TOKENS.spacing.xl,
  },
  productsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: TOKENS.spacing.sm,
  },
  productCol: {
    width: "48%",
  },
});
