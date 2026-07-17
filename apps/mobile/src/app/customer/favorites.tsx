import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card } from "@/components/ui";
import { Heart, ShoppingBag, Star } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerFavoritesScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const { error: deleteError } = await supabase
        .from("customer_favorites")
        .delete()
        .eq("id", favoriteId);

      if (deleteError) throw deleteError;
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
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
      <View style={styles.header}>
        <Typography variant="h1" align="right" style={styles.headerTitle}>المفضلة</Typography>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {error ? (
          <View style={styles.emptyContainer}>
            <Heart color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              تعذّر تحميل المفضلة
            </Typography>
            <Typography variant="body" color="error" style={{ marginTop: 8, textAlign: "center" }}>
              {error}
            </Typography>
            <TouchableOpacity onPress={fetchFavorites} style={{ marginTop: 16 }}>
              <Typography variant="caption" color="primary">إعادة المحاولة</Typography>
            </TouchableOpacity>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Heart color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              قائمة المفضلة فارغة
            </Typography>
            <Typography variant="body" color="disabled" style={{ marginTop: 8, textAlign: "center" }}>
              أضف منتجاتك المفضلة لتجدها هنا
            </Typography>
          </View>
        ) : (
          <View style={styles.grid}>
            {favorites.map((item) => {
              const product = item.products;
              if (!product) return null;

              return (
                <Card key={item.id} style={styles.favoriteCard}>
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => handleRemoveFavorite(item.id)}
                  >
                    <Heart size={20} color={colors.error} fill={colors.error} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      router.push({ pathname: "/product-details", params: { id: product.id } })
                    }
                  >
                    <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgElevated }]}>
                      {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={styles.productImage} />
                      ) : (
                        <ShoppingBag color={colors.textDisabled} size={32} />
                      )}
                    </View>

                    <View style={[styles.cardInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                      <Typography variant="h3" numberOfLines={1}>{product.name}</Typography>
                      <Typography variant="caption" color="secondary">
                        {product.stores?.name || "متجر"}
                      </Typography>
                      <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                        <Typography variant="h3" color="primary">
                          {((product.price_minor ?? 0) / 100).toFixed(2)} د.ج
                        </Typography>
                        <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                          <ShoppingBag size={16} color={colors.textOnBrand} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
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
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { color: TOKENS.colors.brandPrimary },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TOKENS.spacing.md,
  },
  favoriteCard: {
    width: "47%",
    padding: TOKENS.spacing.sm,
    position: "relative",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 4,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: TOKENS.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: TOKENS.spacing.sm,
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  cardInfo: { gap: 2 },
  priceRow: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
