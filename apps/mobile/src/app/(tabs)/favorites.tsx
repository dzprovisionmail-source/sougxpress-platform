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
import {
  getCourierFavoritesHub,
  getMerchantFavoriteCouriers,
  toggleCourierFavorite,
  toggleMerchantFavorite,
  type CourierFavoriteCard,
  type CourierFavoriteTargetType,
  type MerchantFavoriteCourier,
} from "@/services/favorite.service";

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
  const [role, setRole] = useState<"customer" | "merchant" | "courier">("customer");

  // Customer state
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "stores" | "couriers">("products");

  // Merchant state
  const [merchantFavorites, setMerchantFavorites] = useState<any[]>([]);
  const [interestedCustomers, setInterestedCustomers] = useState<any[]>([]);
  const [merchantFavoriteCouriers, setMerchantFavoriteCouriers] = useState<MerchantFavoriteCourier[]>([]);
  const [merchantCourierCandidates, setMerchantCourierCandidates] = useState<MerchantFavoriteCourier[]>([]);
  const [merchantActiveTab, setMerchantActiveTab] = useState<"interested" | "favorites" | "couriers">("interested");
  const [selectedMerchantCustomer, setSelectedMerchantCustomer] = useState<any | null>(null);

  // Courier state: courier-owned favorites are separate from customer -> courier favorites.
  const [courierActiveTab, setCourierActiveTab] = useState<"stores" | "customers">("stores");
  const [courierFavorites, setCourierFavorites] = useState<{
    stores: CourierFavoriteCard[];
    customers: CourierFavoriteCard[];
  }>({ stores: [], customers: [] });
  const [courierCandidates, setCourierCandidates] = useState<{
    stores: CourierFavoriteCard[];
    customers: CourierFavoriteCard[];
  }>({ stores: [], customers: [] });
  const [courierBusyTarget, setCourierBusyTarget] = useState<string | null>(null);

  useEffect(() => {
    checkRoleAndFetch();
  }, [activeTab, courierActiveTab]);

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

      const userRole = profile?.role === "merchant"
        ? "merchant"
        : profile?.role === "driver"
          ? "courier"
          : "customer";
      setRole(userRole);

      if (userRole === "merchant") {
        await fetchMerchantData(user.id);
      } else if (userRole === "courier") {
        await fetchCourierData(user.id);
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
      setMerchantFavoriteCouriers([]);
      setMerchantCourierCandidates([]);

      const { data: courierData, error: courierError } = await getMerchantFavoriteCouriers(userId);
      if (courierError || !courierData) {
        console.error("Error fetching merchant favorite couriers:", courierError);
      } else {
        setMerchantFavoriteCouriers(courierData.favorites);
        setMerchantCourierCandidates(courierData.candidates);
      }

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

  const handleToggleMerchantCourierFavorite = async (courierId: string) => {
    try {
      const { error } = await toggleMerchantFavorite(courierId, "courier");
      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      const merchantId = authData.user?.id;
      if (!merchantId) throw new Error("Merchant session not found");

      const { data, error: refreshError } = await getMerchantFavoriteCouriers(merchantId);
      if (refreshError || !data) throw refreshError || new Error("Unable to refresh merchant courier favorites");
      setMerchantFavoriteCouriers(data.favorites);
      setMerchantCourierCandidates(data.candidates);
    } catch (err) {
      console.error("Error toggling merchant courier favorite:", err);
    }
  };

  const fetchCourierData = async (courierId: string) => {
    const { data, error } = await getCourierFavoritesHub(courierId);
    if (error || !data) {
      setCourierFavorites({ stores: [], customers: [] });
      setCourierCandidates({ stores: [], customers: [] });
      if (error) throw error;
      return;
    }
    setCourierFavorites(data.favorites);
    setCourierCandidates(data.candidates);
  };

  const handleToggleCourierFavorite = async (
    targetType: CourierFavoriteTargetType,
    targetId: string,
  ) => {
    const busyKey = `${targetType}:${targetId}`;
    if (courierBusyTarget === busyKey) return;

    try {
      setCourierBusyTarget(busyKey);
      const { error } = await toggleCourierFavorite(targetType, targetId);
      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      const courierId = authData.user?.id;
      if (!courierId) throw new Error("Courier session not found");

      const { data, error: refreshError } = await getCourierFavoritesHub(courierId);
      if (refreshError || !data) throw refreshError || new Error("Unable to refresh courier favorites");
      setCourierFavorites(data.favorites);
      setCourierCandidates(data.candidates);
    } catch (err) {
      console.error("Error toggling courier favorite:", err);
    } finally {
      setCourierBusyTarget(null);
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

  // RENDER COURIER FAVORITES (Preferred Stores & Customers)
  if (role === "courier") {
    const currentFavorites = courierActiveTab === "stores"
      ? courierFavorites.stores
      : courierFavorites.customers;
    const currentCandidates = courierActiveTab === "stores"
      ? courierCandidates.stores.filter(item => !item.isFavorite)
      : courierCandidates.customers.filter(item => !item.isFavorite);

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
        <Header title="مفضلة الموصل" />

        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity
            onPress={() => setCourierActiveTab("stores")}
            style={[
              styles.tabItem,
              courierActiveTab === "stores" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: courierActiveTab === "stores" ? colors.primary : colors.textSecondary,
                fontWeight: courierActiveTab === "stores" ? "700" : "500",
              }}
            >
              المتاجر ({courierFavorites.stores.length})
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCourierActiveTab("customers")}
            style={[
              styles.tabItem,
              courierActiveTab === "customers" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: courierActiveTab === "customers" ? colors.primary : colors.textSecondary,
                fontWeight: courierActiveTab === "customers" ? "700" : "500",
              }}
            >
              الزبائن ({courierFavorites.customers.length})
            </Typography>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <Typography variant="caption" color="secondary" align="right" style={styles.sectionDescription}>
            تظهر هنا العلاقات المرتبطة بتوصيلاتك الفعلية فقط. لا يتم عرض أرقام هواتف الزبائن.
          </Typography>

          {currentFavorites.length > 0 && (
            <>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                المفضلة
              </Typography>
              <View style={courierActiveTab === "stores" ? styles.list : styles.grid}>
                {currentFavorites.map((item) => {
                  const busy = courierBusyTarget === `${item.target_type}:${item.target_id}`;
                  if (courierActiveTab === "stores" && item.store) {
                    const store = item.store;
                    return (
                      <View key={item.id} style={styles.courierStoreItem}>
                        <StoreCard
                          id={store.id}
                          name={store.name}
                          category={getArabicCategoryName(store.main_category || store.category)}
                          rating={store.rating?.toString() || "0.0"}
                          coverImage={store.cover_url}
                          logoImage={store.logo_url}
                          isOpen={store.status === "active" || store.is_open}
                          isFeatured={false}
                          isFavorite={true}
                          onToggleFavorite={() => handleToggleCourierFavorite("store", store.id)}
                          address={store.address_line1 || store.city}
                          onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
                        />
                        {busy && <ActivityIndicator size="small" color={colors.primary} style={styles.cardActivity} />}
                      </View>
                    );
                  }

                  if (courierActiveTab === "customers" && item.customer) {
                    const customer = item.customer;
                    return (
                      <View key={item.id} style={styles.cardWrapper}>
                        <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                          <Avatar uri={customer.avatar_url} name={customer.full_name || "زبون"} size="lg" />
                          <Typography variant="subtitle" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                            {customer.full_name || "زبون"}
                          </Typography>
                          <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                            {customer.neighborhood || customer.address || "بدون عنوان"}
                          </Typography>
                          <TouchableOpacity
                            onPress={() => handleToggleCourierFavorite("customer", customer.id)}
                            style={styles.removeBtn}
                            disabled={busy}
                          >
                            {busy ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Heart size={16} color={colors.error} fill={colors.error} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </>
          )}

          {currentFavorites.length === 0 && currentCandidates.length === 0 && (
            <View style={styles.emptyContainer}>
              <Heart size={64} color={colors.textDisabled} strokeWidth={1.5} />
              <Typography variant="subtitle" color="secondary" style={{ marginTop: 16 }} align="center">
                لا توجد علاقات متاحة بعد
              </Typography>
              <Typography variant="caption" color="secondary" style={{ marginTop: 8 }} align="center">
                ستظهر المتاجر والزبائن هنا بعد تنفيذ توصيلات حقيقية.
              </Typography>
            </View>
          )}

          {currentCandidates.length > 0 && (
            <>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                علاقات التوصيل
              </Typography>
              <Typography variant="caption" color="secondary" style={styles.sectionDescription}>
                أضف العلاقة إلى مفضلتك لتصل إليها بسرعة في التوصيلات القادمة.
              </Typography>
              <View style={courierActiveTab === "stores" ? styles.list : styles.grid}>
                {currentCandidates.map((item) => {
                  const busy = courierBusyTarget === `${item.target_type}:${item.target_id}`;
                  if (courierActiveTab === "stores" && item.store) {
                    const store = item.store;
                    return (
                      <View key={item.id} style={styles.courierStoreItem}>
                        <StoreCard
                          id={store.id}
                          name={store.name}
                          category={getArabicCategoryName(store.main_category || store.category)}
                          rating={store.rating?.toString() || "0.0"}
                          coverImage={store.cover_url}
                          logoImage={store.logo_url}
                          isOpen={store.status === "active" || store.is_open}
                          isFeatured={false}
                          isFavorite={false}
                          onToggleFavorite={() => handleToggleCourierFavorite("store", store.id)}
                          address={store.address_line1 || store.city}
                          onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
                        />
                        {busy && <ActivityIndicator size="small" color={colors.primary} style={styles.cardActivity} />}
                      </View>
                    );
                  }

                  if (courierActiveTab === "customers" && item.customer) {
                    const customer = item.customer;
                    return (
                      <View key={item.id} style={styles.cardWrapper}>
                        <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                          <Avatar uri={customer.avatar_url} name={customer.full_name || "زبون"} size="lg" />
                          <Typography variant="subtitle" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                            {customer.full_name || "زبون"}
                          </Typography>
                          <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                            {customer.neighborhood || customer.address || "بدون عنوان"}
                          </Typography>
                          <TouchableOpacity
                            onPress={() => handleToggleCourierFavorite("customer", customer.id)}
                            style={[styles.removeBtn, { backgroundColor: colors.primary + "15" }]}
                            disabled={busy}
                          >
                            {busy ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Heart size={16} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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

          <TouchableOpacity
            onPress={() => setMerchantActiveTab("couriers")}
            style={[
              styles.tabItem,
              merchantActiveTab === "couriers" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: merchantActiveTab === "couriers" ? colors.primary : colors.textSecondary,
                fontWeight: merchantActiveTab === "couriers" ? "700" : "500",
              }}
            >
              الموصلون ({merchantFavoriteCouriers.length})
            </Typography>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {merchantActiveTab === "couriers" ? (
            merchantCourierCandidates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
                <Typography variant="subtitle" color="secondary" style={{ marginTop: 16 }}>
                  لا يوجد موصلون نشطون حالياً
                </Typography>
              </View>
            ) : (
              <View style={styles.merchantCourierList}>
                <Typography variant="caption" color="secondary" align="right" style={{ marginBottom: TOKENS.spacing.sm }}>
                  اختر الموصلين المفضلين لتسهيل التعاون في طلباتك القادمة
                </Typography>
                {merchantCourierCandidates.map((item) => {
                  const courier = item.courier;
                  const vehicleLabel = courier.vehicle_type === "motorcycle"
                    ? "دراجة نارية"
                    : courier.vehicle_type === "car"
                      ? "سيارة"
                      : courier.vehicle_type === "bicycle"
                        ? "دراجة"
                        : courier.vehicle_type || "موصل";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.merchantCourierCard,
                        { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <Avatar uri={courier.avatar_url} name={courier.full_name || "موصل"} size="lg" />
                      <View style={styles.merchantCourierDetails}>
                        <Typography variant="subtitle" numberOfLines={1}>
                          {courier.full_name || "موصل Soug-XPRESS"}
                        </Typography>
                        <Typography variant="caption" color="secondary" numberOfLines={1}>
                          {courier.neighborhood || "عين صفراء"} · {vehicleLabel}
                        </Typography>
                        <View style={styles.ratingRow}>
                          <Star size={13} color="#FFD700" fill="#FFD700" />
                          <Typography variant="caption" style={{ marginLeft: 4 }}>
                            {courier.rating === null ? "—" : Number(courier.rating).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="secondary" style={{ marginLeft: 12 }}>
                            {courier.delivery_count ?? 0} توصيلات
                          </Typography>
                        </View>
                        <Typography
                          variant="caption"
                          style={{ color: courier.availability === "online" ? colors.success : colors.textSecondary }}
                        >
                          {courier.availability === "online" ? "متاح الآن" : "غير متاح حالياً"}
                        </Typography>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleMerchantCourierFavorite(courier.id)}
                        style={[
                          styles.merchantCourierFavoriteButton,
                          { borderColor: item.isFavorite ? colors.error : colors.primary },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={item.isFavorite ? "إزالة الموصل من المفضلة" : "إضافة الموصل إلى المفضلة"}
                      >
                        <Heart
                          size={22}
                          color={item.isFavorite ? colors.error : colors.primary}
                          fill={item.isFavorite ? colors.error : "transparent"}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )
          ) : merchantActiveTab === "interested" ? (
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
    alignItems: "center",
    position: "relative",
    minHeight: 190,
  },
  merchantCourierList: {
    width: "100%",
  },
  merchantCourierCard: {
    width: "100%",
    minHeight: 112,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
  },
  merchantCourierDetails: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  merchantCourierFavoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  sectionTitle: {
    marginTop: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.sm,
    textAlign: "right",
  },
  sectionDescription: {
    marginBottom: TOKENS.spacing.sm,
    lineHeight: 20,
  },
  courierStoreItem: {
    width: "100%",
    marginBottom: TOKENS.spacing.md,
    position: "relative",
  },
  cardActivity: {
    position: "absolute",
    top: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  }
});
