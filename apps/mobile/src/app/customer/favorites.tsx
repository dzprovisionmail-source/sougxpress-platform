import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  ProductCard,
  StoreCard,
  EmptyState,
  Header,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function CustomerFavoritesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "stores">("products");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

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

      const { data, error: fetchError } = await supabase
        .from("customer_favorites")
        .select(`
          id,
          created_at,
          products (
            id,
            name,
            price_minor,
            image_url,
            is_available,
            stores ( name )
          )
        `)
        .eq("customer_id", user.id);

      if (fetchError) throw fetchError;
      setFavorites(data || []);
    } catch (err: any) {
      console.error("Error fetching favorites:", err);
      setError("حدث خطأ أثناء تحميل المفضلة");
    } finally {      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("customer_favorites")
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
      <Header title="المفضلة" showBack={false} />

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
            المنتجات المفضلة
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
            المتاجر المحفوظة
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
            onAction={() => router.push("/customer/home")}
          />
        ) : (
          <View style={styles.grid}>
            {favorites.map((item) => {
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
    width: "48%",
  },
});
