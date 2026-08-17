import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  I18nManager,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Star, Heart, ChevronRight, ChevronLeft, Users } from "lucide-react-native";
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

/**
 * Verified Favorites Gateway Screen - Phase 2 & 3 Commercial Cycle
 */
export default function FavoritesGatewayScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  
  // Customer state
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "stores" | "couriers">("products");

  // Merchant state
  const [merchantFavorites, setMerchantFavorites] = useState<any[]>([]);
  const [interestedCustomers, setInterestedCustomers] = useState<any[]>([]);
  const [merchantActiveTab, setMerchantActiveTab] = useState<"interested" | "favorites">("interested");
  const [selectedMerchantCustomer, setSelectedMerchantCustomer] = useState<any | null>(null);

  useEffect(() => {
    checkRoleAndFetch();
  }, [activeTab]);

  const checkRoleAndFetch = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const userRole = profile?.role === "merchant" ? "merchant" : "customer";
      setRole(userRole);

      if (userRole === "merchant") {
        await fetchMerchantData(user.id);
      } else {
        await fetchCustomerFavorites(user.id);
      }
    } catch (err) {
      console.error("Error in favorites gateway:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMerchantData = async (userId: string) => {
    try {
      setMerchantFavorites([]);
      setInterestedCustomers([]);

      // A merchant may own more than one store. Never use maybeSingle() here:
      // Phase 2 must read interest for every store owned by the authenticated merchant.
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("id")
        .eq("merchant_id", userId);

      if (storesError) throw storesError;
      const storeIds = (stores || []).map(store => store.id).filter(Boolean);

      // Phase 3: customers explicitly favorited by this merchant.
      const { data: favs, error: favoritesError } = await supabase
        .from("merchant_favorites")
        .select("id, target_id, created_at")
        .eq("merchant_id", userId)
        .eq("target_type", "customer");

      if (favoritesError) throw favoritesError;

      if (favs && favs.length > 0) {
        const customerIds = favs.map(f => f.target_id);
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, full_name, avatar_url, phone, neighborhood")
          .in("id", customerIds);

        if (customerError) throw customerError;
        setMerchantFavorites(favs.map(f => ({
          ...f,
          customer: customerData?.find(c => c.id === f.target_id),
        })).filter(f => !!f.customer));
      }

      // Phase 2: customers who favorited any store owned by this merchant.
      if (storeIds.length === 0) return;

      const { data: interestedFavs, error: interestedError } = await supabase
        .from("customer_favorites")
        .select("id, customer_id, target_id, created_at")
        .eq("target_type", "store")
        .in("target_id", storeIds);

      if (interestedError) throw interestedError;
      if (!interestedFavs || interestedFavs.length === 0) return;

      const customerIds = interestedFavs.map(f => f.customer_id);
      const { data: customerData, error: interestedCustomersError } = await supabase
        .from("customers")
        .select("id, full_name, avatar_url, phone, neighborhood")
        .in("id", customerIds);

      if (interestedCustomersError) throw interestedCustomersError;
      setInterestedCustomers(interestedFavs.map(f => ({
        ...f,
        customer: customerData?.find(c => c.id === f.customer_id),
      })).filter(f => !!f.customer));
    } catch (err) {
      console.error("Error fetching merchant data:", err);
      setMerchantFavorites([]);
      setInterestedCustomers([]);
    }
  };

  const handleAddMerchantFavorite = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from("merchant_favorites")
        .insert({
          merchant_id: (await supabase.auth.getUser()).data.user?.id,
          target_type: "customer",
          target_id: customerId,
        });
      if (error) throw error;
      await fetchMerchantData((await supabase.auth.getUser()).data.user?.id || "");
    } catch (err) {
      console.error("Error adding merchant favorite:", err);
    }
  };

  const fetchCustomerFavorites = async (userId: string) => {
    try {
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
          .eq("user_id", userId);

        if (fetchError) throw fetchError;
        setFavorites(data || []);
      } else if (activeTab === "products") {
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
          .eq("customer_id", userId)
          .not("product_id", "is", null);

        if (fetchError) throw fetchError;
        setFavorites(data || []);
      } else if (activeTab === "stores") {
        const { data: favs, error: fetchError } = await supabase
          .from("customer_favorites")
          .select("id, target_id")
          .eq("customer_id", userId)
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
    } catch (err) {
      console.error("Error fetching customer favorites:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    checkRoleAndFetch();
  };

  const handleRemoveCustomerFavorite = async (favoriteId: string) => {
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

  const handleRemoveMerchantFavorite = async (favoriteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("merchant_favorites")
        .delete()
        .eq("id", favoriteId);
      if (deleteError) throw deleteError;
      setMerchantFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
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

  // RENDER MERCHANT FAVORITES (Interested & Favorites)
  if (role === "merchant") {
    const favoriteCustomerIds = merchantFavorites.map(f => f.target_id);

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
        <Header title="إدارة الزبائن والمفضلة" />
        
        {/* Merchant Tabs Switcher */}
        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={() => setMerchantActiveTab("interested")}
            style={[
              styles.tabItem,
              merchantActiveTab === "interested" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: merchantActiveTab === "interested" ? colors.primary : colors.textSecondary,
                fontWeight: merchantActiveTab === "interested" ? "700" : "500",
              }}
            >
              الزبائن المهتمون ({interestedCustomers.length})
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMerchantActiveTab("favorites")}
            style={[
              styles.tabItem,
              merchantActiveTab === "favorites" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: merchantActiveTab === "favorites" ? colors.primary : colors.textSecondary,
                fontWeight: merchantActiveTab === "favorites" ? "700" : "500",
              }}
            >
              زبائني المفضلون ({merchantFavorites.length})
            </Typography>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {merchantActiveTab === "interested" ? (
            interestedCustomers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
                <Typography variant="subtitle" color="secondary" style={{ marginTop: 16 }}>
                  لا يوجد زبائن فضلوا متجرك بعد
                </Typography>
              </View>
            ) : (
              <View style={styles.grid}>
                {interestedCustomers.map((item) => {
                  const customer = item.customer;
                  if (!customer) return null;
                  const isAlreadyFav = favoriteCustomerIds.includes(customer.id);

                  return (
                    <View key={item.id} style={styles.cardWrapper}>
                      <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                        <Avatar uri={customer.avatar_url} name={customer.full_name} size="lg" />
                        <Typography variant="subtitle" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                          {customer.full_name}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                          {customer.neighborhood || "بدون عنوان"}
                        </Typography>
                        <TouchableOpacity
                          onPress={() => setSelectedMerchantCustomer(customer)}
                          style={styles.viewProfileButton}
                        >
                          <Typography variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>
                            عرض الحساب
                          </Typography>
                        </TouchableOpacity>
                        {isAlreadyFav ? (
                          <View style={styles.removeBtn}>
                            <Heart size={16} color={colors.error} fill={colors.error} />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleAddMerchantFavorite(customer.id)}
                            style={[styles.removeBtn, { backgroundColor: colors.primary + '15' }]}
                          >
                            <Heart size={16} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            merchantFavorites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
                <Typography variant="subtitle" color="secondary" style={{ marginTop: 16 }}>
                  لا يوجد زبائن مفضلون بعد
                </Typography>
              </View>
            ) : (
              <View style={styles.grid}>
                {merchantFavorites.map((item) => {
                  const customer = item.customer;
                  if (!customer) return null;
                  return (
                    <View key={item.id} style={styles.cardWrapper}>
                      <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                        <Avatar uri={customer.avatar_url} name={customer.full_name} size="lg" />
                        <Typography variant="subtitle" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                          {customer.full_name}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                          {customer.neighborhood || "بدون عنوان"}
                        </Typography>
                        <TouchableOpacity
                          onPress={() => setSelectedMerchantCustomer(customer)}
                          style={styles.viewProfileButton}
                        >
                          <Typography variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>
                            عرض الحساب
                          </Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveMerchantFavorite(item.id)}
                          style={styles.removeBtn}
                        >
                          <Heart size={16} color={colors.error} fill={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>

        <Modal
          visible={selectedMerchantCustomer !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedMerchantCustomer(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.profileModal, { backgroundColor: colors.bgElevated }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                <Typography variant="title">حساب الزبون</Typography>
                <TouchableOpacity
                  onPress={() => setSelectedMerchantCustomer(null)}
                  accessibilityRole="button"
                  accessibilityLabel="إغلاق حساب الزبون"
                >
                  <Typography variant="button" style={{ color: colors.primary }}>
                    إغلاق
                  </Typography>
                </TouchableOpacity>
              </View>

              {selectedMerchantCustomer && (
                <View style={styles.profileContent}>
                  <Avatar
                    uri={selectedMerchantCustomer.avatar_url}
                    name={selectedMerchantCustomer.full_name}
                    size="lg"
                  />
                  <Typography variant="title" align="center" style={{ marginTop: TOKENS.spacing.md }}>
                    {selectedMerchantCustomer.full_name}
                  </Typography>
                  <Typography variant="caption" color="secondary" align="center" style={{ marginTop: TOKENS.spacing.sm }}>
                    العنوان
                  </Typography>
                  <Typography variant="subtitle" align="center">
                    {selectedMerchantCustomer.neighborhood || "بدون عنوان"}
                  </Typography>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // RENDER CUSTOMER FAVORITES (Products, Stores, Couriers)
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title="المفضلة" />

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
                        onPress={() => handleRemoveCustomerFavorite(item.id)}
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
                      onToggleFavorite={() => handleRemoveCustomerFavorite(item.id)}
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
                    onToggleFavorite={() => handleRemoveCustomerFavorite(item.id)}
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
  customerFavoriteCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 190,
  },
  viewProfileButton: {
    marginTop: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  profileModal: {
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: 1,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xl,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  }
});
