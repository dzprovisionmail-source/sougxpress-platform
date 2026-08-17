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
import { Heart, ChevronRight, ChevronLeft, Users } from "lucide-react-native";
import {
  Typography,
  EmptyState,
  Header,
  Avatar,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function MerchantFavoritesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch favorite customers
      const { data: favs, error: fetchError } = await supabase
        .from("merchant_favorites")
        .select("id, target_id")
        .eq("merchant_id", user.id)
        .eq("target_type", "customer");

      if (fetchError) throw fetchError;

      if (favs && favs.length > 0) {
        const customerIds = favs.map(f => f.target_id);
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, full_name, avatar_url, phone, neighborhood")
          .in("id", customerIds);
        
        if (customerError) throw customerError;
        
        setFavorites(favs.map(f => ({
          ...f,
          customer: customerData.find(c => c.id === f.target_id)
        })).filter(f => !!f.customer));
      } else {
        setFavorites([]);
      }
    } catch (err: any) {
      console.error("Error fetching merchant favorites:", err);
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
        .from("merchant_favorites")
        .delete()
        .eq("id", favoriteId);
      if (deleteError) throw deleteError;
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch (err) {
      console.error("Error removing merchant favorite:", err);
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
        title="الزبائن المفضلون" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            {isRTL ? <ChevronRight size={24} color={colors.textPrimary} /> : <ChevronLeft size={24} color={colors.textPrimary} />}
          </TouchableOpacity>
        } 
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
            <Typography variant="subtitle" color="secondary" style={{ marginTop: 16 }}>
              لا يوجد زبائن مفضلون بعد
            </Typography>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((item) => {
              const customer = item.customer;
              return (
                <View 
                  key={item.id} 
                  style={[styles.customerCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                >
                  <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Avatar uri={customer.avatar_url} name={customer.full_name} size="lg" />
                    <View style={[styles.infoContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Typography variant="subtitle" style={{ fontWeight: '700' }}>
                        {customer.full_name}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {customer.neighborhood || "بدون عنوان"}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {customer.phone || "بدون هاتف"}
                      </Typography>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFavorite(item.id)}
                      style={styles.removeBtn}
                    >
                      <Heart size={20} color={colors.error} fill={colors.error} />
                    </TouchableOpacity>
                  </View>
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
  scrollContent: {
    padding: TOKENS.spacing.md,
    flexGrow: 1,
  },
  list: {
    gap: TOKENS.spacing.md,
  },
  customerCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
  },
  cardHeader: {
    alignItems: 'center',
    gap: TOKENS.spacing.md,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  removeBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  }
});
