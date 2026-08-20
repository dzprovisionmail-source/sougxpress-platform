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
import { Star, Heart, ChevronRight, ChevronLeft, Users, MessageCircle, Search } from "lucide-react-native";
import {
  Typography,
  ProductCard,
  StoreCard,
  EmptyState,
  Header,
  Avatar,
  Button,
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
import { getOrCreateConversation, type RelationshipType } from "@/services/chat.service";

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
  const [startingChat, setStartingChat] = useState<string | null>(null);

  // Courier state: courier-owned favorites are separate from customer -> courier favorites.
  const [courierActiveTab, setCourierActiveTab] = useState<"interested" | "stores" | "customers">("interested");
  const [courierInterestedCustomers, setCourierInterestedCustomers] = useState<any[]>([]);
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
      setCourierInterestedCustomers([]);
      if (error) throw error;
      return;
    }
    setCourierFavorites(data.favorites);
    setCourierCandidates(data.candidates);
    setCourierInterestedCustomers(data.interestedCustomers || []);
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
      setCourierInterestedCustomers(data.interestedCustomers || []);
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

  const handleStartChat = async (otherUserId: string, relationshipType: RelationshipType, referenceId?: string) => {
    if (startingChat) return;
    try {
      setStartingChat(otherUserId);
      const { data: conversationId, error } = await getOrCreateConversation(
        otherUserId,
        relationshipType,
        referenceId || null
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
    } finally {
      setStartingChat(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // RENDER COURIER FAVORITES (Interested Customers, Preferred Stores & Customers)
  if (role === "courier") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
        <Header title="مفضلة الموصل" />

        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity
            onPress={() => setCourierActiveTab("interested")}
            style={[
              styles.tabItem,
              courierActiveTab === "interested" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Typography
              variant="button"
              style={{
                color: courierActiveTab === "interested" ? colors.primary : colors.textSecondary,
                fontWeight: courierActiveTab === "interested" ? "700" : "500",
              }}
            >
              الزبائن المهتمون ({courierInterestedCustomers.length})
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
              زبائني المفضلون ({courierFavorites.customers.length})
            </Typography>
          </TouchableOpacity>

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
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <Typography variant="caption" color="secondary" align="right" style={styles.sectionDescription}>
            تظهر هنا العلاقات المرتبطة بتوصيلاتك وقائمة المفضلين. لا يتم عرض أرقام هواتف الزبائن.
          </Typography>

          {courierActiveTab === "interested" && (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                الزبائن الذين وضعوك في المفضلة ({courierInterestedCustomers.length})
              </Typography>
              {courierInterestedCustomers.length > 0 ? (
                <View style={styles.grid}>
                  {courierInterestedCustomers.map((item) => (
                    <View key={item.id} style={styles.cardWrapper}>
                      <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                        <Avatar uri={item.avatar_url} name={item.full_name || "زبون"} size="lg" />
                        <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                          {item.full_name || "زبون"}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                          {item.neighborhood || "بدون عنوان"}
                        </Typography>
                        <View style={{ flexDirection: "row", marginTop: 10, gap: 12 }}>
                          <View style={styles.removeBtn}>
                            <Heart size={16} color={colors.error} fill={colors.error} />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Heart size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                  <Typography variant="h3" align="center" color="secondary">
                    لا يوجد زبائن مهتمون بعد
                  </Typography>
                  <Typography variant="caption" align="center" color="secondary" style={{ marginTop: 4 }}>
                    سيظهر هنا الزبائن الذين قاموا بإضافتك إلى قائمتهم المفضلة.
                  </Typography>
                </View>
              )}
            </>
          )}

          {courierActiveTab === "customers" && (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                زبائني المفضلون ({courierFavorites.customers.length})
              </Typography>
              {courierFavorites.customers.length > 0 ? (
                <View style={styles.grid}>
                  {courierFavorites.customers.map((item) => {
                    const busy = courierBusyTarget === `customer:${item.target_id}`;
                    const customer = item.customer;
                    if (!customer) return null;
                    return (
                      <View key={item.id} style={styles.cardWrapper}>
                        <View style={[styles.customerFavoriteCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                          <Avatar uri={customer.avatar_url} name={customer.full_name || "زبون"} size="lg" />
                          <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
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
                        <View style={styles.ctaWrapper}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="دردشة"
                            onPress={() => handleStartChat(customer.id, "customer_courier")}
                            icon={<MessageCircle size={14} color={colors.primary} />}
                            loading={startingChat === customer.id}
                            style={{ width: '100%' }}
                          />
                        </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Heart size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                  <Typography variant="h3" align="center" color="secondary">
                    لا توجد زبائن مفضلون بعد
                  </Typography>
                  <Typography variant="caption" align="center" color="secondary" style={{ marginTop: 4 }}>
                    قم بإضافة زبائن إلى قائمتك المفضلة لتظهر هنا.
                  </Typography>
                </View>
              )}
            </>
          )}

          {courierActiveTab === "stores" && (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                المتاجر المفضلة ({courierFavorites.stores.length})
              </Typography>
              {courierFavorites.stores.length > 0 ? (
                <View style={styles.list}>
                  {courierFavorites.stores.map((item) => {
                    const busy = courierBusyTarget === `store:${item.target_id}`;
                    const store = item.store;
                    if (!store) return null;
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
                          onChatPress={() => handleStartChat(store.merchant_id, "merchant_courier")}
                          address={store.address_line1 || store.city}
                          onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
                        />
                        {busy && <ActivityIndicator size="small" color={colors.primary} style={styles.cardActivity} />}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Heart size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                  <Typography variant="h3" align="center" color="secondary">
                    لا توجد متاجر مفضلة بعد
                  </Typography>
                  <Typography variant="caption" align="center" color="secondary" style={{ marginTop: 4 }}>
                    قم بوضع قلب على المتاجر لتظهر هنا.
                  </Typography>
                </View>
              )}
            </>
          )}

          {/* Delivery Relationships / Candidates Section */}
          {(courierActiveTab === "stores" ? courierCandidates.stores : courierCandidates.customers).length > 0 && (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                {courierActiveTab === "stores" ? "متاجر تعاملت معها" : "زبائن تعاملت معهم"}
              </Typography>
              <Typography variant="caption" color="secondary" style={styles.sectionDescription}>
                أضف العلاقة إلى مفضلتك لتصل إليها بسرعة في التوصيلات القادمة.
              </Typography>
              <View style={courierActiveTab === "stores" ? styles.list : styles.grid}>
                {(courierActiveTab === "stores" ? courierCandidates.stores : courierCandidates.customers).map((item) => {
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
                          isFavorite={item.isFavorite}
                          onToggleFavorite={() => handleToggleCourierFavorite("store", store.id)}
                          onChatPress={() => handleStartChat(store.merchant_id, "merchant_courier")}
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
                          <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
                            {customer.full_name || "زبون"}
                          </Typography>
                          <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                            {customer.neighborhood || customer.address || "بدون عنوان"}
                          </Typography>
                          <TouchableOpacity
                            onPress={() => handleToggleCourierFavorite("customer", customer.id)}
                            style={[styles.removeBtn, { backgroundColor: item.isFavorite ? colors.primary + "15" : colors.bgBase }]}
                            disabled={busy}
                          >
                            {busy ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Heart size={16} color={item.isFavorite ? colors.primary : colors.textDisabled} fill={item.isFavorite ? colors.primary : "none"} />
                            )}
                          </TouchableOpacity>
                          <View style={styles.ctaWrapper}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="دردشة"
                              onPress={() => handleStartChat(customer.id, "customer_courier")}
                              icon={<MessageCircle size={14} color={colors.primary} />}
                              loading={startingChat === customer.id}
                              style={{ width: '100%' }}
                            />
                          </View>
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
            merchantFavoriteCouriers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
                <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
                  قائمة الموصلين المفضلين فارغة
                </Typography>
                <Typography variant="caption" color="secondary" align="center" style={{ marginTop: 8, paddingHorizontal: 40 }}>
                  يمكنك إضافة الموصلين للمفضلة من خلال تفاصيل الطلبات أو البحث عنهم.
                </Typography>
              </View>
            ) : (
              <View style={styles.merchantCourierList}>
                {merchantFavoriteCouriers.map((item) => {
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
                        <Typography variant="h3" numberOfLines={1} style={{ fontWeight: '700' }}>
                          {courier.full_name || "موصل Soug-XPRESS"}
                        </Typography>
                        <Typography variant="caption" color="secondary" numberOfLines={1}>
                          {courier.neighborhood || "عين صفراء"} · {vehicleLabel}
                        </Typography>
                        <View style={styles.ratingRow}>
                          <Star size={12} color="#FFD700" fill="#FFD700" />
                          <Typography variant="caption" style={{ marginLeft: 4, fontWeight: '600' }}>
                            {courier.rating === null ? "5.0" : Number(courier.rating).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="secondary" style={{ marginLeft: 8 }}>
                            ({courier.delivery_count ?? 0} توصيلة)
                          </Typography>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: courier.availability === "online" ? colors.success + '15' : colors.textSecondary + '15' }]}>
                          <View style={[styles.statusDot, { backgroundColor: courier.availability === "online" ? colors.success : colors.textSecondary }]} />
                          <Typography
                            variant="caption"
                            style={{ color: courier.availability === "online" ? colors.success : colors.textSecondary, fontSize: 10, fontWeight: '600' }}
                          >
                            {courier.availability === "online" ? "متاح الآن" : "غير متصل"}
                          </Typography>
                        </View>
                      </View>
                      
                      <View style={styles.merchantActionColumn}>
                        <TouchableOpacity
                          onPress={() => handleToggleMerchantCourierFavorite(courier.id)}
                          style={styles.merchantMiniActionBtn}
                        >
                          <Heart
                            size={20}
                            color={colors.error}
                            fill={colors.error}
                          />
                        </TouchableOpacity>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          title="دردشة"
                          onPress={() => handleStartChat(courier.id, "merchant_courier")}
                          icon={<MessageCircle size={16} color={colors.primary} />}
                          loading={startingChat === courier.id}
                          style={{ marginTop: 8, paddingHorizontal: 12 }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : merchantActiveTab === "interested" ? (
            interestedCustomers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={64} color={colors.textDisabled} strokeWidth={1.5} />
                <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
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
                        <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8, fontWeight: '700' }}>
                          {customer.full_name}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                          {customer.neighborhood || "عين صفراء"}
                        </Typography>
                        
                        <View style={styles.merchantCardActions}>
                          <TouchableOpacity
                            onPress={() => setSelectedMerchantCustomer(customer)}
                            style={[styles.merchantActionBtn, { borderColor: colors.borderSubtle }]}
                          >
                            <Search size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                          
                          {isAlreadyFav ? (
                            <View style={[styles.merchantActionBtn, { borderColor: 'transparent' }]}>
                              <Heart size={16} color={colors.error} fill={colors.error} />
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleAddMerchantFavorite(customer.id)}
                              style={[styles.merchantActionBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                            >
                              <Heart size={16} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={[styles.ctaWrapper, { marginTop: 8 }]}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="دردشة مع الزبون"
                            onPress={() => handleStartChat(customer.id, "customer_merchant")}
                            icon={<MessageCircle size={14} color={colors.primary} />}
                            loading={startingChat === customer.id}
                            style={{ width: '100%' }}
                          />
                        </View>
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
                <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
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
                        <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8, fontWeight: '700' }}>
                          {customer.full_name}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                          {customer.neighborhood || "عين صفراء"}
                        </Typography>
                        
                        <View style={styles.merchantCardActions}>
                          <TouchableOpacity
                            onPress={() => setSelectedMerchantCustomer(customer)}
                            style={[styles.merchantActionBtn, { borderColor: colors.borderSubtle }]}
                          >
                            <Search size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => handleRemoveMerchantFavorite(item.id)}
                            style={[styles.merchantActionBtn, { borderColor: colors.error + '30', backgroundColor: colors.error + '05' }]}
                          >
                            <Heart size={16} color={colors.error} fill={colors.error} />
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.ctaWrapper, { marginTop: 8 }]}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="دردشة مع الزبون"
                            onPress={() => handleStartChat(customer.id, "customer_merchant")}
                            icon={<MessageCircle size={14} color={colors.primary} />}
                            loading={startingChat === customer.id}
                            style={{ width: '100%' }}
                          />
                        </View>
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
                <Typography variant="h2">حساب الزبون</Typography>
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
                  <Typography variant="h2" align="center" style={{ marginTop: TOKENS.spacing.md }}>
                    {selectedMerchantCustomer.full_name}
                  </Typography>
                  <Typography variant="caption" color="secondary" align="center" style={{ marginTop: TOKENS.spacing.sm }}>
                    العنوان
                  </Typography>
                  <Typography variant="h3" align="center">
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
                      <Typography variant="h3" align="center" numberOfLines={1} style={{ marginTop: 8 }}>
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
                      <View style={[styles.ctaWrapper, { marginTop: 12 }]}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="دردشة"
                          onPress={() => handleStartChat(driver.id, "customer_courier")}
                          icon={<MessageCircle size={14} color={colors.primary} />}
                          loading={startingChat === driver.id}
                          style={{ width: '100%' }}
                        />
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
                      onChatPress={() => handleStartChat(store.merchant_id, "customer_merchant")}
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
    minHeight: 200,
  },
  customerFavoriteCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: "center",
    position: "relative",
    minHeight: 220,
  },
  ctaWrapper: {
    width: '100%',
    marginTop: 'auto',
  },
  merchantCourierList: {
    width: "100%",
  },
  merchantCourierCard: {
    width: "100%",
    minHeight: 100,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  merchantCourierDetails: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  merchantActionColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  merchantMiniActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  merchantCardActions: {
    flexDirection: 'row-reverse',
    marginTop: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  merchantActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  cardActionsRow: {
    flexDirection: "row",
    marginTop: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
    width: "100%",
    justifyContent: "center",
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  }
});
