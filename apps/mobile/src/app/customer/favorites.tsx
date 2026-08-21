import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Star, Heart, MessageCircle, Phone, Bike } from "lucide-react-native";
import { getOrCreateConversation, getCommercialPhone, logCallPress } from "@/services/chat.service";
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
              availability,
              is_available
            )
          `)
          .eq("user_id", user.id);

        if (fetchError) throw fetchError;
        setFavorites(data || []);
      } else {
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

  const handleStartChat = async (targetId: string) => {
    try {
      const { data: convId, error } = await getOrCreateConversation(targetId, "customer_courier", null);
      if (error) throw error;
      if (convId) router.push(`/chat/${convId}`);
    } catch (err) {
      console.error("Chat error:", err);
      Alert.alert("تنبيه", "لا يمكن بدء محادثة في الوقت الحالي.");
    }
  };

  const handleCall = async (driverId: string) => {
    try {
      // Use the updated getCommercialPhone which supports targetId for favorites
      const { data: phone, error } = await getCommercialPhone("FAVORITE", "courier", driverId);
      if (error || !phone) {
        Alert.alert("تنبيه", "رقم الهاتف متاح فقط للمفضلين أو أثناء الطلب النشط.");
        return;
      }
      
      // Log audit - using '0000...' as a special marker for permanent favorite calls
      await logCallPress("00000000-0000-0000-0000-000000000000", driverId, "customer_courier");
      
      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.error("Error starting call:", err);
      Alert.alert("خطأ", "فشل بدء الاتصال.");
    }
  };

  const handleDirectOrder = (driverId: string) => {
    // Redirect directly to checkout with this driver pre-selected
    router.push({ pathname: "/checkout", params: { id: driverId } });
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
      <Header title="المفضلة" leftContent={null} />

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

                      <View style={styles.actionRow}>
                        <TouchableOpacity 
                          style={[styles.miniActionBtn, { backgroundColor: colors.primary + '10' }]}
                          onPress={() => handleDirectOrder(driver.id)}
                        >
                          <Bike size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.miniActionBtn, { backgroundColor: colors.success + '10' }]}
                          onPress={() => handleStartChat(driver.id)}
                        >
                          <MessageCircle size={14} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.miniActionBtn, { backgroundColor: colors.primary + '10' }]}
                          onPress={() => handleCall(driver.id)}
                        >
                          <Phone size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
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
  courierCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
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
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
