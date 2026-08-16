import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  I18nManager,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
  Badge,
  Header,
  Price,
  EmptyState,
  Button,
  BottomSheet,
} from "@/components/ui";
import {
  Phone,
  Clock,
  Store,
  MapPin,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Bike,
  Star,
  UserCheck,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

interface CourierInfo {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  vehicle_type?: string;
  rating?: number;
  delivery_count?: number;
}

interface OrderItem {
  id: string;
  status: string;
  order_total_minor: number;
  subtotal_minor?: number;
  delivery_fee_minor?: number;
  created_at: string;
  stores?: { name: string; id?: string };
  delivery_address_id?: string;
  notes?: string;
  delivery_assignments?: {
    status: string;
    driver_id: string;
    drivers?: CourierInfo;
  }[];
}

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [favoriteCourierIds, setFavoriteCourierIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
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

      // Fetch favorite couriers
      const { data: favs } = await supabase
        .from("favorite_couriers")
        .select("courier_id")
        .eq("user_id", user.id);

      if (favs) {
        setFavoriteCourierIds(favs.map((f: any) => f.courier_id));
      } else {
        setFavoriteCourierIds([]);
      }

      // Fetch orders with store, address, and delivery assignments with driver info
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          order_total_minor,
          subtotal_minor,
          delivery_fee_minor,
          created_at,
          stores ( id, name ),
          delivery_address_id,
          notes,
          delivery_assignments (
            status,
            driver_id,
            drivers:driver_id (
              id,
              full_name,
              phone,
              avatar_url,
              vehicle_type,
              rating,
              delivery_count
            )
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setOrders((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("حدث خطأ أثناء تحميل الطلبات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("customer_orders_all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_assignments" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadgeVariant = (status: string): "warning" | "info" | "success" | "error" | "default" => {
    switch (status) {
      case "pending":
        return "warning";
      case "confirmed":
      case "accepted":
      case "preparing":
      case "ready_for_pickup":
      case "courier_assigned":
      case "out_for_delivery":
      case "picked_up":
        return "info";
      case "delivered":
        return "success";
      case "cancelled":
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "confirmed":
      case "accepted":
        return "طلب مؤكد";
      case "preparing":
        return "جاري التحضير";
      case "ready_for_pickup":
        return "جاهز للاستلام";
      case "courier_assigned":
        return "تم تعيين موصل";
      case "out_for_delivery":
      case "picked_up":
        return "في الطريق إليك";
      case "delivered":
        return "تم التسليم";
      case "cancelled":
        return "تم الإلغاء";
      case "rejected":
        return "مرفوض من المتجر";
      default:
        return status;
    }
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => {
    const assignment = item.delivery_assignments?.[0];
    const courier = assignment?.drivers;
    const isFavorite = courier ? favoriteCourierIds.includes(courier.id) : false;

    return (
      <Card key={item.id} style={styles.orderCard}>
        {/* Order Header */}
        <View style={[styles.orderHeaderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.storeInfoCol}>
            <View style={[styles.storeTitleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Store size={18} color={colors.primary} />
              <Typography variant="h3">{item.stores?.name || "متجر محلي"}</Typography>
            </View>
            <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
              رقم الطلب #{item.id.slice(0, 8)} • {new Date(item.created_at).toLocaleDateString("ar-DZ")}
            </Typography>
          </View>

          <Badge
            label={getStatusLabel(item.status)}
            variant={getStatusBadgeVariant(item.status)}
          />
        </View>

        {/* Assigned Courier Preview Banner if assigned */}
        {courier && (
          <View style={[styles.courierBanner, { backgroundColor: colors.bgSurface, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.courierInfoLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.courierAvatarContainer, { backgroundColor: colors.primary + '20' }]}>
                {courier.avatar_url ? (
                  <Image source={{ uri: courier.avatar_url }} style={styles.courierAvatar} />
                ) : (
                  <Bike size={16} color={colors.primary} />
                )}
              </View>
              <View>
                <View style={[styles.courierNameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Typography variant="body" style={{ fontWeight: 'bold' }}>{courier.full_name || "موصل طلبات"}</Typography>
                  {isFavorite && (
                    <View style={[styles.favoriteBadge, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Typography variant="caption" style={{ color: '#d97706', fontSize: 10, fontWeight: 'bold' }}>مفضل</Typography>
                    </View>
                  )}
                </View>
                <Typography variant="caption" color="secondary">
                  الموصل المنفذ للطلب • تقييم ({courier.rating || '5.0'})
                </Typography>
              </View>
            </View>

            {courier.phone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${courier.phone}`)}
                style={[styles.callButton, { backgroundColor: colors.primary }]}
              >
                <Phone size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Order Details & Actions */}
        <View style={[styles.orderFooterRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View>
            <Typography variant="caption" color="secondary">الإجمالي</Typography>
            <Price amount={item.order_total_minor || 0} isMinor size="lg" variant="brand" />
          </View>

          <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Button
              title="التفاصيل"
              onPress={() => setSelectedOrder(item)}
              variant="outline"
              size="sm"
            />
            {item.stores?.id && (
              <Button
                title="إعادة الطلب"
                onPress={() =>
                  router.push({ pathname: "/store-details", params: { id: item.stores?.id } })
                }
                variant="outline"
                size="sm"
                icon={<RotateCcw size={14} color={colors.primary} />}
              />
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedAssignment = selectedOrder?.delivery_assignments?.[0];
  const selectedCourier = selectedAssignment?.drivers;
  const isSelectedFavorite = selectedCourier ? favoriteCourierIds.includes(selectedCourier.id) : false;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title="طلباتي" leftContent={null} />

      {error ? (
        <View style={styles.centered}>
          <Typography variant="body" color="error">{error}</Typography>
          <Button title="إعادة المحاولة" onPress={fetchOrders} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              type="no-orders"
              onAction={() => router.push("/(tabs)/home")}
            />
          }
        />
      )}

      {/* Order Details Bottom Sheet */}
      <BottomSheet
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`تفاصيل الطلب #${selectedOrder?.id.slice(0, 8)}`}
      >
        {selectedOrder && (
          <View style={styles.sheetContent}>
            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary">المتجر</Typography>
              <Typography variant="h3">{selectedOrder.stores?.name || "متجر"}</Typography>
            </View>

            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary">الحالة الحالية</Typography>
              <Badge
                label={getStatusLabel(selectedOrder.status)}
                variant={getStatusBadgeVariant(selectedOrder.status)}
              />
            </View>

            {/* Courier Section in Bottom Sheet */}
            {selectedCourier ? (
              <View style={[styles.sheetCourierCard, { backgroundColor: colors.bgSurface }]}>
                <View style={[styles.sheetCourierHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Bike size={20} color={colors.primary} />
                  <Typography variant="h3">الموصل المنفذ للطلب</Typography>
                  {isSelectedFavorite && (
                    <View style={[styles.favoriteBadge, { flexDirection: isRTL ? "row-reverse" : "row", marginLeft: 'auto' }]}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Typography variant="caption" style={{ color: '#d97706', fontSize: 10, fontWeight: 'bold' }}>مفضل</Typography>
                    </View>
                  )}
                </View>
                <View style={[styles.sheetCourierDetails, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View>
                    <Typography variant="body" style={{ fontWeight: 'bold' }}>{selectedCourier.full_name}</Typography>
                    <Typography variant="caption" color="secondary">
                      مركبة: {selectedCourier.vehicle_type || 'دراجة'} • عدد التوصيلات: {selectedCourier.delivery_count || 0}
                    </Typography>
                  </View>
                  {selectedCourier.phone && (
                    <Button
                      title="اتصال"
                      onPress={() => Linking.openURL(`tel:${selectedCourier.phone}`)}
                      size="sm"
                      icon={<Phone size={14} color="#fff" />}
                    />
                  )}
                </View>
              </View>
            ) : (
              <View style={[styles.sheetCourierCard, { backgroundColor: colors.bgSurface }]}>
                <Typography variant="caption" color="secondary" align="center">
                  جاري تعيين موصل مناسب من منظومة التوصيل...
                </Typography>
              </View>
            )}

            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary">تاريخ الطلب</Typography>
              <Typography variant="body">
                {new Date(selectedOrder.created_at).toLocaleString("ar-DZ")}
              </Typography>
            </View>

            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary">مجموع المنتجات</Typography>
              <Price amount={selectedOrder.subtotal_minor || (selectedOrder.order_total_minor - (selectedOrder.delivery_fee_minor || 20000))} isMinor size="sm" />
            </View>

            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary">رسوم التوصيل</Typography>
              <Price amount={selectedOrder.delivery_fee_minor || 20000} isMinor size="sm" />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <View style={[styles.sheetRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="body" color="secondary" style={{ fontWeight: 'bold' }}>المبلغ الإجمالي</Typography>
              <Price amount={selectedOrder.order_total_minor || 0} isMinor size="md" variant="brand" />
            </View>

            {selectedOrder.notes ? (
              <View style={styles.notesBox}>
                <Typography variant="caption" color="secondary" align="right">
                  ملاحظات الطلب: {selectedOrder.notes}
                </Typography>
              </View>
            ) : null}

            <View style={{ marginTop: TOKENS.spacing.lg }}>
              <Button
                title="الاتصال بخدمة العملاء"
                onPress={() => Linking.openURL("tel:0550000000")}
                variant="outline"
                icon={<Phone size={18} color={colors.primary} />}
              />
            </View>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
    flexGrow: 1,
  },
  orderCard: {
    padding: TOKENS.spacing.md,
  },
  orderHeaderRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  storeInfoCol: {
    flex: 1,
  },
  storeTitleRow: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  courierBanner: {
    marginTop: TOKENS.spacing.sm,
    padding: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },
  courierInfoLeft: {
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    flex: 1,
  },
  courierAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  courierAvatar: {
    width: 32,
    height: 32,
  },
  courierNameRow: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  favoriteBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    gap: 2,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.sm,
  },
  orderFooterRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsRow: {
    gap: TOKENS.spacing.xs,
  },
  sheetContent: {
    gap: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
  },
  sheetRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetCourierCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.sm,
    gap: TOKENS.spacing.sm,
  },
  sheetCourierHeader: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  sheetCourierDetails: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  notesBox: {
    padding: TOKENS.spacing.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: TOKENS.radius.sm,
    marginTop: TOKENS.spacing.xs,
  },
});
