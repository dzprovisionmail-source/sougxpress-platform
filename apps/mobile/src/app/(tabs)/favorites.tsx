import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Star, Heart, ChevronRight, ChevronLeft } from "lucide-react-native";
import {
  Typography,
  ProductCard,
  StoreCard,
  EmptyState,
  Header,
  Avatar,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getArabicCategoryName } from "@/config/storeCategories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CustomerFavoritesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "stores" | "couriers">("products");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, [activeTab]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (activeTab === "couriers") {
        const { data, error: fetchError } = await supabase
          .from("favorite_couriers")
          .select(`
            id,
            created_at,
            drivers:courier_id (
              id,
              full_name,
              avatar_url,
              rating,
              delivery_count,
              vehicle_type,
              status,
              availability
            )
          `)
          .eq("user_id", user.id);

        if (fetchError) throw fetchError;
        setFavorites(data || []);
      } else if (activeTab === "products") {
        // Fetch products using the product_id column which has a FK
        const { data, error: fetchError } = await supabase
          .from("customer_favorites")
          .select(`
            id,
            product_id,
            products:product_id (
              id,
              name,
              price_minor,
              image_url,
              is_available,
              store_id,
              stores:store_id ( name )
            )
          `)
          .eq("customer_id", user.id)
          .not("product_id", "is", null);

        if (fetchError) throw fetchError;
        setFavorites(data || []);
      } else if (activeTab === "stores") {
        // Since there's no FK for target_id to stores, we fetch IDs then details
        const { data: favs, error: fetchError } = await supabase
          .from("customer_favorites")
          .select("id, target_id")
          .eq("customer_id", user.id)
          .eq("target_type", "store");

        if (fetchError) throw fetchError;

        if (favs && favs.length > 0) {
          const storeIds = favs.map(f => f.target_id);
          const { data: storeData, error: storeError } = await supabase
            .from("stores")
            .select("*")
            .in("id", storeIds);
          
          if (storeError) throw storeError;
          
          setFavorites(favs.map(f => ({
            ...f,
            stores: storeData.find(s => s.id === f.target_id)
          })).filter(f => !!f.stores));
        } else {
          setFavorites([]);
        }
      }
    } catch (err: any) {
      console.error("Error fetching favorites:", err);
      setError("حدث خطأ أثناء تحميل المفضلة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const table = activeTab === "couriers" ? "favorite_couriers" : "customer_favorites";
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", favoriteId);
      if (deleteError) throw deleteError;
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header 
        title="المفضلة" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            {isRTL ? <ChevronRight size={24} color={colors.textPrimary} /> : <ChevronLeft size={24} color={colors.textPrimary} />}
          </TouchableOpacity>
        } 
      />

      {/* Tabs Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("products")}
          style={[
            styles.tabItem,
            activeTab === "products" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Typography
            variant="button"
            style={{
              color: activeTab === "products" ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === "products" ? "700" : "500",
            }}
          >
            المنتجات
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("stores")}
          style={[
            styles.tabItem,
            activeTab === "stores" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Typography
            variant="button"
            style={{
              color: activeTab === "stores" ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === "stores" ? "700" : "500",
            }}
          >
            المتاجر
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("couriers")}
          style={[
            styles.tabItem,
            activeTab === "couriers" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Typography
            variant="button"
            style={{
              color: activeTab === "couriers" ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === "couriers" ? "700" : "500",
            }}
          >
            الموصلون
          </Typography>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {favorites.length === 0 ? (
          <EmptyState
            type="empty-favorites"
            onAction={() => router.push("/(tabs)/home")}
          />
        ) : (
          <View style={styles.grid}>
            {favorites.map((item) => {
              if (activeTab === "couriers") {
                const driver = item.drivers;
                if (!driver) return null;
                return (
                  <View key={item.id} style={styles.cardWrapper}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/courier/[id]", params: { id: driver.id } })}
                      style={[styles.courierCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                    >
                      <Avatar uri={driver.avatar_url} name={driver.full_name} size="lg" />
                      <Typography variant="subtitle" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                        {driver.full_name}
                      </Typography>
                      <Typography variant="caption" color="secondary" align="center">
                        {driver.vehicle_type === 'motorcycle' ? 'دراجة نارية' : 
                         driver.vehicle_type === 'car' ? 'سيارة' : 
                         driver.vehicle_type === 'bicycle' ? 'دراجة' : 'موصل'}
                      </Typography>
                      <View style={styles.ratingRow}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Typography variant="caption" style={{ marginLeft: 4 }}>{driver.rating || '5.0'}</Typography>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveFavorite(item.id)}
                        style={styles.removeBtn}
                      >
                        <Heart size={16} color={colors.error} fill={colors.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                );
              }

              if (activeTab === "stores") {
                const store = item.stores;
                if (!store) return null;
                return (
                  <View key={item.id} style={{ width: '100%', marginBottom: TOKENS.spacing.md }}>
	                    <StoreCard
	                      id={store.id}
	                      name={store.name}
	                      category={getArabicCategoryName(store.main_category || store.category)}
	                      subcategory={store.sub_category}
	                      rating={store.rating?.toString() || "0.0"}
	                      coverImage={store.cover_url}
	                      logoImage={store.logo_url}
	                      isOpen={store.status === "active"}
	                      isFeatured={store.is_featured}
	                      isFavorite={true}
	                      onToggleFavorite={() => handleRemoveFavorite(item.id)}
	                      address={store.address_line1 ?? store.city ?? ""}
	                      onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
	                    />
                  </View>
                );
              }
              
              const product = item.products;
              if (!product) return null;
              return (
                <View key={item.id} style={styles.cardWrapper}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price_minor ? product.price_minor / 100 : 0}
                    image={product.image_url}
                    storeName={product.stores?.name || "متجر"}
                    isFavorite={true}
                    onToggleFavorite={() => handleRemoveFavorite(item.id)}
                    onPress={() =>
                      router.push({ pathname: "/product-details", params: { id: product.id } })
                    }
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: {
    borderBottomWidth: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    paddingVertical: TOKENS.spacing.md,
    alignItems: "center",
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: TOKENS.spacing.sm,
  },
  cardWrapper: {
    width: (SCREEN_WIDTH - TOKENS.spacing.md * 2 - TOKENS.spacing.sm) / 2,
  },
  courierCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    height: 160,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
});
