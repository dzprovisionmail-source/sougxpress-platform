import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card, Badge } from "@/components/ui";
import { ClipboardList } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          order_total_minor,
          created_at,
          stores ( name )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("حدث خطأ أثناء تحميل الطلبات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":           return <Badge variant="warning" label="قيد الانتظار" />;
      case "confirmed":
      case "accepted":          return <Badge variant="info"    label="مؤكد" />;
      case "preparing":         return <Badge variant="info"    label="قيد التحضير" />;
      case "ready_for_pickup":  return <Badge variant="info"    label="جاهز للاستلام" />;
      case "out_for_delivery":
      case "picked_up":         return <Badge variant="info"    label="في الطريق" />;
      case "delivered":         return <Badge variant="success" label="تم التوصيل" />;
      case "cancelled":
      case "rejected":          return <Badge variant="error"   label="ملغي" />;
      default:                  return <Badge variant="default" label={status} />;
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <Card style={styles.orderCard}>
      <View style={[styles.orderHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.storeInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Typography variant="h3">{item.stores?.name || "متجر"}</Typography>
          <Typography variant="caption" color="secondary">
            {new Date(item.created_at).toLocaleDateString("ar-DZ")}
          </Typography>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={[styles.orderFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.priceInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Typography variant="caption" color="secondary">إجمالي الطلب</Typography>
          <Typography variant="h3" color="primary">
            {((item.order_total_minor ?? 0) / 100).toFixed(2)} د.ج
          </Typography>
        </View>
        <TouchableOpacity
          style={[styles.detailsBtn, { backgroundColor: colors.bgElevated }]}
          onPress={() => { /* Navigate to order details */ }}
        >
          <Typography variant="caption" style={{ fontWeight: "600" }}>التفاصيل</Typography>
        </TouchableOpacity>
      </View>
    </Card>
  );

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
        <Typography variant="h1" align="right" style={styles.headerTitle}>طلباتي</Typography>
      </View>

      {error ? (
        <View style={styles.emptyContainer}>
          <Typography variant="body" color="error">{error}</Typography>
          <TouchableOpacity onPress={fetchOrders} style={{ marginTop: 16 }}>
            <Typography variant="caption" color="primary">إعادة المحاولة</Typography>
          </TouchableOpacity>
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
            <View style={styles.emptyContainer}>
              <ClipboardList color={colors.textDisabled} size={64} />
              <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
                لا توجد طلبات حالياً
              </Typography>
            </View>
          }
        />
      )}
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
  listContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
    flexGrow: 1,
  },
  orderCard: { padding: TOKENS.spacing.md },
  orderHeader: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingBottom: TOKENS.spacing.sm,
  },
  storeInfo: { flex: 1 },
  orderFooter: { justifyContent: "space-between", alignItems: "center" },
  priceInfo: { flex: 1 },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.full,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
