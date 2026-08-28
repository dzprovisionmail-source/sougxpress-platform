import { useMarketPresence } from "@/hooks/useMarketPresence";
import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  I18nManager,
  Image,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalSearchParams, useRouter } from "expo-router";
import {
  Star, Heart, User, MapPin, MessageCircle, Phone,
  ShoppingBag, Info, Store, Search, CheckCircle
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import {
  WorkspaceScreen,
  WorkspaceText,
  SectionCard,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";
import {
  getCourierFavoritesHub,
  getMerchantFavoriteCouriers,
  getCustomerFavoritesDetailed,
  toggleCourierFavorite,
  toggleMerchantFavorite,
  toggleFavorite,
  type CourierFavoriteCard,
  type CourierFavoriteTargetType,
  type MerchantFavoriteCourier,
  type CourierFavoritesHubData,
} from "@/services/favorite.service";
import { toggleFavoriteCourier } from "@/services/courierService";
import { getUserDisplayName } from "@/utils/user-display";
import {
  getOrCreateConversation,
  getCommercialPhone,
  logCallPress,
  type RelationshipType,
} from "@/services/chat.service";
import { supabase } from "@/lib/supabase";

/**
 * Unified Favorites Screen for all roles (Customer, Merchant, Courier).
 * Refactored to prioritize the professional Courier-Customer commercial cycle.
 */
export default function FavoritesScreen() {
  useMarketPresence("market");
  const router = useRouter();
  const params = useGlobalSearchParams<{ preview?: string; identity?: string }>();
  const marketContextParams = params.identity === "soug-admin" && (params.preview === "1" || params.preview === undefined)
    ? { preview: "1", identity: "soug-admin" }
    : {};
  const { userId, loading: authLoading } = useCurrentUserId();
  const { colors, tokens } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<"customer" | "merchant" | "courier">("customer");
  const [activeTab, setActiveTab] = useState<string>("");

  // Role-specific data
  const [customerData, setCustomerData] = useState<{
    products: any[];
    stores: any[];
    couriers: any[];
  }>({ products: [], stores: [], couriers: [] });
  const [merchantData, setMerchantData] = useState<{
    favorites: any[];
    interested: any[];
    couriers: MerchantFavoriteCourier[];
  }>({ favorites: [], interested: [], couriers: [] });

  const [courierData, setCourierData] = useState<CourierFavoritesHubData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calling, setCalling] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const userRole = profile?.role === "merchant" ? "merchant" :
                       profile?.role === "driver" ? "courier" : "customer";

      setRole(prev => prev !== userRole ? userRole : prev);

      if (userRole === "courier") {
        const { data, error } = await getCourierFavoritesHub(userId);
        if (error) throw error;
        setCourierData(data);
      } else if (userRole === "merchant") {
        const { data: courierResult } = await getMerchantFavoriteCouriers(userId);
        setMerchantData(prev => ({ ...prev, couriers: courierResult?.favorites || [] }));
      } else {
        // Customer Role
        const { data: favsResult, error: favsError } = await getCustomerFavoritesDetailed(userId);
        if (favsError) throw favsError;
        if (favsResult) {
          setCustomerData({
            products: favsResult.products || [],
            stores: favsResult.stores || [],
            couriers: favsResult.couriers || []
          });
        }
      }
    } catch (err) {
      console.error("Error fetching favorites data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || authLoading) return;
    void fetchData();
  }, [userId, authLoading, fetchData]);

  // Tab initialization effect
  useEffect(() => {
    if (!activeTab && role) {
      if (role === "courier") setActiveTab("connected");
      else if (role === "merchant") setActiveTab("interested");
      else setActiveTab("products");
    }
  }, [role, activeTab]);

  const handleToggleFavorite = async (type: 'product' | 'store' | 'driver', id: string) => {
    if (busyId === id) return;
    setBusyId(id);
    try {
      if (type === 'driver') {
        await toggleFavoriteCourier(userId!, id);
      } else {
        await toggleFavorite(type, id);
      }
      await fetchData(true);
    } finally {
      setBusyId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void fetchData(true);
  };

  // --- Courier Actions ---
  const handleCourierToggleFavorite = async (type: CourierFavoriteTargetType, id: string) => {
    if (busyId === id) return;
    setBusyId(id);
    try {
      await toggleCourierFavorite(type, id);
      await fetchData(true);
    } finally {
      setBusyId(null);
    }
  };

  const handleCall = async (orderId: string | null, receiverId: string, targetRole: 'customer' | 'merchant' | 'courier') => {
    if (!receiverId || calling) return;
    setCalling(receiverId);
    try {
      // Use FAVORITE marker if no active order
      const effectiveOrderId = orderId || "FAVORITE";
      const { data: phone, error } = await getCommercialPhone(effectiveOrderId, targetRole as any, receiverId);

      if (error || !phone) {
        Alert.alert("تنبيه", "رقم الهاتف متاح فقط للمفضلين أو أثناء وجود طلب نشط.");
        return;
      }

      const rel = role === 'courier' ? 'customer_courier' : 'customer_merchant';
      // Log audit - use zero UUID for permanent favorite calls
      const auditOrderId = orderId || "00000000-0000-0000-0000-000000000000";
      await logCallPress(auditOrderId, receiverId, rel);

      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.error("Call error:", err);
      Alert.alert("خطأ", "فشل بدء الاتصال.");
    } finally {
      setCalling(null);
    }
  };

  const handleStartChat = async (targetId: string | null | undefined, type: RelationshipType, orderId: string | null) => {
    try {
      if (!targetId) {
        throw new Error("Chat participant profile not found");
      }

      const { data: convId, error } = await getOrCreateConversation(targetId, type, orderId);
      if (error) throw error;
      if (convId) {
        router.push({
          pathname: "/chat/[id]",
          params: { id: convId, ...marketContextParams },
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      Alert.alert("تنبيه", "لا يمكن بدء المحادثة حالياً.");
    }
  };

  const handleDirectOrder = (driverId: string) => {
    router.push({ pathname: "/checkout", params: { id: driverId } });
  };

  // --- Renderers ---

  const renderCourierCustomer = (item: any, isFavorite: boolean) => {
    const customer = item.customer || item;
    const hasActiveOrder = !!customer.last_order_id &&
      ['pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery'].includes(customer.last_assignment_status || '');

    return (
      <SectionCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.bgSurface }]}>
              {customer.avatar_url ? (
                <Image source={{ uri: customer.avatar_url }} style={styles.avatarImage} />
              ) : (
                <User size={24} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.nameContainer}>
              <WorkspaceText variant="subtitle" style={styles.name}>
                {getUserDisplayName(customer, customer.role)}
              </WorkspaceText>
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.textSecondary} />
                <WorkspaceText variant="caption" color="secondary">
                  {customer.neighborhood || 'عين صفراء'}
                </WorkspaceText>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleCourierToggleFavorite('customer', customer.id)}>
            <Heart size={20} color={isFavorite ? colors.error : colors.textDisabled} fill={isFavorite ? colors.error : 'transparent'} />
          </TouchableOpacity>
        </View>

        {customer.last_order_id && (
          <View style={[styles.orderContext, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.orderInfoRow}>
              <ShoppingBag size={14} color={colors.primary} />
              <WorkspaceText variant="caption" style={{ fontWeight: '600' }}>
                طلب من {customer.store_name || 'المتجر'}
              </WorkspaceText>
            </View>
            <WorkspaceText variant="caption" color="secondary">
              الحالة: {customer.last_assignment_status === 'pending' ? 'بانتظار قبولك' : 'قيد التوصيل'}
            </WorkspaceText>
          </View>
        )}

        {customer.delivery_count > 0 && (
          <View style={[styles.orderContext, { backgroundColor: colors.bgSurface, marginTop: -4, borderTopWidth: 1, borderTopColor: '#eee' }]}>
            <View style={styles.orderInfoRow}>
              <CheckCircle size={14} color={colors.success} />
              <WorkspaceText variant="caption" style={{ fontWeight: '600' }}>
                {customer.delivery_count} توصيلات مكتملة
              </WorkspaceText>
            </View>
            {customer.last_delivery_at && (
              <WorkspaceText variant="caption" color="secondary">
                آخر تعامل: {new Date(customer.last_delivery_at).toLocaleDateString('ar-DZ')}
              </WorkspaceText>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleStartChat(customer.id, "customer_courier", customer.last_order_id || null)}
          >
            <MessageCircle size={18} color={colors.primary} />
            <WorkspaceText variant="caption" color="primary">مراسلة</WorkspaceText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleCall(customer.last_order_id || null, customer.id, 'customer')}
            disabled={calling === customer.id}
          >
            {calling === customer.id ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <Phone size={18} color={colors.success} />
                <WorkspaceText variant="caption" style={{ color: colors.success }}>اتصال</WorkspaceText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => customer.last_order_id ? router.push(`/driver/deliveries?orderId=${customer.last_order_id}`) : Alert.alert("تنبيه", "لا يوجد طلب نشط حالياً لعرض تفاصيله.")}
          >
            <Info size={18} color={colors.textSecondary} />
            <WorkspaceText variant="caption" color="secondary">تفاصيل</WorkspaceText>
          </TouchableOpacity>
        </View>
      </SectionCard>
    );
  };

  const renderCourierStore = (card: CourierFavoriteCard) => {
    const store = card.store;
    if (!store) return null;
    return (
      <SectionCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.bgSurface }]}>
              {store.logo_url ? <Image source={{ uri: store.logo_url }} style={styles.avatarImage} /> : <Store size={24} color={colors.textSecondary} />}
            </View>
            <View style={styles.nameContainer}>
              <WorkspaceText variant="subtitle" style={styles.name}>{store.name}</WorkspaceText>
              <WorkspaceText variant="caption" color="secondary">{store.city || 'عين صفراء'}</WorkspaceText>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleCourierToggleFavorite('store', store.id)}>
            <Heart size={20} color={card.isFavorite ? colors.error : colors.textDisabled} fill={card.isFavorite ? colors.error : 'transparent'} />
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1, borderColor: colors.borderSubtle }]} onPress={() => router.push({ pathname: "/store-details", params: { id: store.id, ...marketContextParams } })}>
            <WorkspaceText variant="caption" color="primary">عرض المتجر</WorkspaceText>
          </TouchableOpacity>
        </View>
      </SectionCard>
    );
  };

  if ((loading || authLoading) && !refreshing) return <LoadingState />;

  // Main UI based on Role
  if (role === "courier") {
    const connectedList = [
      ...(courierData?.favorites.customers || []),
      ...(courierData?.interestedCustomers || []).filter(c => !courierData?.favorites.customers.some(f => f.target_id === c.customer_id))
    ];

    return (
      <WorkspaceScreen title="المفضلة التجارية" showHeader>
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'connected' && styles.activeTab]} onPress={() => setActiveTab('connected')}>
            <WorkspaceText style={[styles.tabText, activeTab === 'connected' && { color: colors.primary, fontWeight: '700' }]}>الزبائن المتصلون</WorkspaceText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'stores' && styles.activeTab]} onPress={() => setActiveTab('stores')}>
            <WorkspaceText style={[styles.tabText, activeTab === 'stores' && { color: colors.primary, fontWeight: '700' }]}>المتاجر المفضلة</WorkspaceText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeTab === 'connected' ? connectedList : courierData?.favorites.stores}
          keyExtractor={(item: any) => {
            const id = item.id || item.customer_id || item.target_id || item.driver?.id;
            const prefix = activeTab === 'connected' ? 'customer' : 'store';
            return `${prefix}:${id}`;
          }}
          renderItem={({ item }) => activeTab === 'connected' ? renderCourierCustomer(item, courierData?.favorites.customers.some(f => f.target_id === (item.customer_id || item.id)) || false) : renderCourierStore(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState title="لا توجد نتائج" description="سيظهر هنا الزبائن والمتاجر الذين تتعامل معهم." />}
        />
      </WorkspaceScreen>
    );
  }

  // --- Customer / Merchant Renderer ---
  const renderFavoriteCourier = (card: MerchantFavoriteCourier) => {
    const courier = card.driver;
    if (!courier) return null;
    return (
      <SectionCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.bgSurface }]}>
              {courier.avatar_url ? <Image source={{ uri: courier.avatar_url }} style={styles.avatarImage} /> : <User size={24} color={colors.textSecondary} />}
            </View>
            <View style={styles.nameContainer}>
              <WorkspaceText variant="subtitle" style={styles.name}>{courier.full_name || 'موصل'}</WorkspaceText>
              <WorkspaceText variant="caption" color="secondary">{courier.neighborhood || 'عين صفراء'}</WorkspaceText>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleToggleFavorite('driver', courier.id)}>
            <Heart size={20} color={colors.error} fill={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleStartChat(courier.profile_id, "customer_courier", null)}
          >
            <MessageCircle size={18} color={colors.primary} />
            <WorkspaceText variant="caption" color="primary">مراسلة</WorkspaceText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleCall(null, courier.id, 'courier')}
            disabled={calling === courier.id}
          >
            {calling === courier.id ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <Phone size={18} color={colors.success} />
                <WorkspaceText variant="caption" style={{ color: colors.success }}>اتصال</WorkspaceText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1.5, backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => handleDirectOrder(courier.id)}
          >
            <ShoppingBag size={18} color="#fff" />
            <WorkspaceText variant="caption" style={{ color: '#fff', fontWeight: 'bold' }}>طلب مباشر</WorkspaceText>
          </TouchableOpacity>
        </View>
      </SectionCard>
    );
  };

  if (role === "customer" || role === "merchant") {
    const renderProduct = (product: any) => (
      <SectionCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.bgSurface }]}>
              {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.avatarImage} /> : <ShoppingBag size={24} color={colors.textSecondary} />}
            </View>
            <View style={styles.nameContainer}>
              <WorkspaceText variant="subtitle" style={styles.name}>{product.name || 'منتج'}</WorkspaceText>
              <WorkspaceText variant="caption" color="secondary">{(product.price_minor / 100).toFixed(2)} دج</WorkspaceText>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleToggleFavorite('product', product.id)}>
            <Heart size={20} color={colors.error} fill={colors.error} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
          onPress={() => router.push({ pathname: "/product-details", params: { id: product.id, ...marketContextParams } })}
        >
          <WorkspaceText variant="caption" color="primary">عرض المنتج</WorkspaceText>
        </TouchableOpacity>
      </SectionCard>
    );

    const renderStore = (store: any) => (
      <SectionCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.bgSurface }]}>
              {store.logo_url ? <Image source={{ uri: store.logo_url }} style={styles.avatarImage} /> : <Store size={24} color={colors.textSecondary} />}
            </View>
            <View style={styles.nameContainer}>
              <WorkspaceText variant="subtitle" style={styles.name}>{store.name || 'متجر'}</WorkspaceText>
              <WorkspaceText variant="caption" color="secondary">{store.city || 'عين صفراء'}</WorkspaceText>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleToggleFavorite('store', store.id)}>
            <Heart size={20} color={colors.error} fill={colors.error} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
          onPress={() => router.push({ pathname: "/store-details", params: { id: store.id, ...marketContextParams } })}
        >
          <WorkspaceText variant="caption" color="primary">زيارة المتجر</WorkspaceText>
        </TouchableOpacity>
      </SectionCard>
    );

    const getListData = () => {
      if (activeTab === 'couriers') return role === 'merchant' ? merchantData.couriers : customerData.couriers;
      if (activeTab === 'products') return customerData.products;
      if (activeTab === 'stores') return customerData.stores;
      return [];
    };

    return (
      <WorkspaceScreen title="المفضلة" showHeader>
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'products' && styles.activeTab]} onPress={() => setActiveTab('products')}>
            <WorkspaceText style={[styles.tabText, activeTab === 'products' && { color: colors.primary, fontWeight: '700' }]}>المنتجات</WorkspaceText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'stores' && styles.activeTab]} onPress={() => setActiveTab('stores')}>
            <WorkspaceText style={[styles.tabText, activeTab === 'stores' && { color: colors.primary, fontWeight: '700' }]}>المتاجر</WorkspaceText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'couriers' && styles.activeTab]} onPress={() => setActiveTab('couriers')}>
            <WorkspaceText style={[styles.tabText, activeTab === 'couriers' && { color: colors.primary, fontWeight: '700' }]}>الموصلون</WorkspaceText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={getListData()}
          keyExtractor={(item: any) => {
            const id = item.id || item.courier_id || item.target_id || item.driver?.id;
            const prefix = activeTab === 'couriers' ? 'courier' : activeTab === 'products' ? 'product' : 'store';
            return `${prefix}:${id}`;
          }}
          renderItem={({ item }) => {
            if (activeTab === 'couriers') return renderFavoriteCourier(item.driver ? item : { driver: item });
            if (activeTab === 'products') return renderProduct(item);
            if (activeTab === 'stores') return renderStore(item);
            return null;
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState title="لا توجد نتائج" description="سيظهر هنا الموصلون والمنتجات المفضلة لديك." />}
        />
      </WorkspaceScreen>
    );
  }

  // Fallback
  return <LoadingState />;
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: "#FF8A00",
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    padding: 12,
  },
  cardHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    marginHorizontal: 12,
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  name: {
    fontWeight: '700',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderContext: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  orderInfoRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
});
