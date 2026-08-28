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
import { Heart, ChevronRight, ChevronLeft, Users, MessageCircle, Phone } from "lucide-react-native";
import {
  Typography,
  EmptyState,
  Header,
  Avatar,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getUserDisplayName } from "@/utils/user-display";
import { getCommercialPhone, getOrCreateConversation, type RelationshipType } from "@/services/chat.service";

type FavoriteContact = {
  id: string;
  target_type: "customer" | "merchant";
  target_id: string;
  contact: any;
};

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

      const { data: favs, error: fetchError } = await supabase
        .from("merchant_favorites")
        .select("id, target_id, target_type")
        .eq("merchant_id", user.id)
        .in("target_type", ["customer", "merchant"]);
      if (fetchError) throw fetchError;

      const customerFavs = (favs || []).filter(f => f.target_type === "customer");
      const merchantFavs = (favs || []).filter(f => f.target_type === "merchant");
      const [customerResult, merchantResult] = await Promise.all([
        customerFavs.length
          ? supabase.from("customers").select("id, full_name, avatar_url, phone, neighborhood").in("id", customerFavs.map(f => f.target_id))
          : Promise.resolve({ data: [], error: null } as any),
        merchantFavs.length
          ? supabase.from("profiles").select("id, full_name, avatar_url, phone_number, role").in("id", merchantFavs.map(f => f.target_id)).eq("role", "merchant")
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (customerResult.error) throw customerResult.error;
      if (merchantResult.error) throw merchantResult.error;

      const contacts: FavoriteContact[] = [
        ...customerFavs.map(f => ({ id: f.id, target_type: "customer" as const, target_id: f.target_id, contact: customerResult.data?.find(c => c.id === f.target_id) })),
        ...merchantFavs.map(f => ({ id: f.id, target_type: "merchant" as const, target_id: f.target_id, contact: merchantResult.data?.find(m => m.id === f.target_id) })),
      ].filter(item => !!item.contact);
      setFavorites(contacts);
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

  const handleStartChat = async (item: FavoriteContact) => {
    const relationshipType: RelationshipType = item.target_type === "merchant" ? "merchant_merchant" : "customer_merchant";
    const { data: conversationId, error: chatError } = await getOrCreateConversation(item.target_id, relationshipType);
    if (chatError || !conversationId) {
      Alert.alert("تنبيه", "لا يمكن بدء المحادثة حالياً.");
      return;
    }
    router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
  };

  const handleCall = async (item: FavoriteContact) => {
    if (item.target_type !== "merchant") {
      Alert.alert("تنبيه", "المكالمة غير متاحة مع الزبون.");
      return;
    }
    const { data: phone, error } = await getCommercialPhone("FAVORITE", "merchant", item.target_id);
    if (error || !phone) {
      Alert.alert("تنبيه", "رقم الهاتف غير متاح حالياً.");
      return;
    }
    await Linking.openURL(`tel:${phone}`);
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
        title="جهات الاتصال المفضلة"
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
              لا توجد جهات اتصال مفضلة بعد
            </Typography>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((item) => {
              const contact = item.contact;
              const isMerchant = item.target_type === "merchant";
              const displayName = getUserDisplayName(contact, item.target_type);
              return (
                <View
                  key={item.id}
                  style={[styles.customerCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                >
                  <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Avatar uri={contact.avatar_url} name={displayName} size="lg" />
                    <View style={[styles.infoContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Typography variant="subtitle" style={{ fontWeight: '700' }}>
                        {displayName}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {isMerchant ? "تاجر" : (contact.neighborhood || "بدون عنوان")}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {(isMerchant ? contact.phone_number : contact.phone) || "بدون هاتف"}
                      </Typography>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => handleStartChat(item)} style={styles.actionBtn}>
                        <MessageCircle size={20} color={colors.primary} />
                      </TouchableOpacity>
                      {isMerchant && (
                        <TouchableOpacity onPress={() => handleCall(item)} style={styles.actionBtn}>
                          <Phone size={20} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                      onPress={() => handleRemoveFavorite(item.id)}
                      style={styles.removeBtn}
                    >
                        <Heart size={20} color={colors.error} fill={colors.error} />
                      </TouchableOpacity>
                    </View>
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
  actions: {
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
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
