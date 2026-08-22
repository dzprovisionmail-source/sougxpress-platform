import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { Truck, MapPin, Clock, CheckCircle, XCircle, ChevronLeft, X, Filter } from "lucide-react-native";
import { SearchBar } from "@/components/ui";
import {
  AdminPageShell,
  AdminStatCard,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderDeliveryAssignments,
  type FounderDeliveryAssignment,
} from "@/services/founder-delivery.service";

type DeliveryStatusFilter = "all" | "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFD600",
  accepted: "#2196F3",
  picked_up: "#FF8A00",
  delivered: "#00C853",
  cancelled: "#D50000",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبولة",
  picked_up: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغاة",
};

export default function FounderDeliveriesScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderDeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedDelivery, setSelectedDelivery] = useState<FounderDeliveryAssignment | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadDeliveries = useCallback(async (q?: string, status?: DeliveryStatusFilter, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const effectiveStatus = status === "all" ? undefined : status;
      const data = await getFounderDeliveryAssignments(q, effectiveStatus);
      setItems(data);
    } catch (err) {
      console.error("Founder Deliveries load error:", err);
      setError("تعذّر تحميل بيانات التوصيلات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries(search, statusFilter);
  }, [loadDeliveries, search, statusFilter]);

  const fmtMinor = (minor: number) => `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;

  const totalCount = items.length;
  const deliveredCount = items.filter((i) => i.status === "delivered").length;
  const activeCount = items.filter((i) => ["pending", "accepted", "picked_up"].includes(i.status)).length;

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="إدارة التوصيلات" showBack>
        <AdminLoadingState message="جاري تحميل التوصيلات الحية..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="إدارة التوصيلات" showBack>
        <AdminErrorState message={error} onRetry={() => loadDeliveries(search, statusFilter)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="إدارة التوصيلات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Search & filter */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث برقم الطلب أو الموصل..."
            onSubmitEditing={() => loadDeliveries(search, statusFilter)}
            onClear={() => loadDeliveries("", statusFilter)}
            onFilterPress={() => setShowFilters(true)}
            style={{ flex: 1 }}
          />
        </View>

        {/* Stats summary */}
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي التوصيلات" value={totalCount} accent={colors.primary} style={{ flex: 1 }} />
          <AdminStatCard label="نشطة" value={activeCount} accent={colors.warning} style={{ flex: 1 }} />
          <AdminStatCard label="مكتملة" value={deliveredCount} accent={colors.success} style={{ flex: 1 }} />
        </View>

        {/* Assignments list */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDeliveries(search, statusFilter, true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد تكليفات توصيل مسجلة" />}
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.status] ?? colors.primary;
            const statusLabel = STATUS_LABELS[item.status] ?? item.status;
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDelivery(item);
                  setShowDetail(true);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.borderSubtle,
                      borderRadius: tokens.radius.md,
                      padding: tokens.spacing.md,
                      marginBottom: tokens.spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: tokens.typography.sizes.base,
                          fontWeight: "700",
                          textAlign: "right",
                          fontFamily: tokens.typography.families.arabic,
                        }}
                        numberOfLines={1}
                      >
                        {item.order?.store?.name ?? "متجر"} · {item.order?.customer?.full_name ?? "زبون"}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: tokens.typography.sizes.xs,
                          textAlign: "right",
                          fontFamily: tokens.typography.families.arabic,
                          marginTop: 3,
                        }}
                      >
                        الموصل: {item.driver?.full_name ?? "غير محدد"} ({item.driver?.phone ?? "—"})
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          textAlign: "right",
                          fontFamily: tokens.typography.families.arabic,
                          marginTop: 2,
                        }}
                      >
                        رسوم التوصيل: {item.order?.delivery_fee_minor != null ? fmtMinor(item.order.delivery_fee_minor) : "غير متوفر"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: statusColor + "18",
                          borderColor: statusColor + "44",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: "700",
                          fontFamily: tokens.typography.families.arabic,
                        }}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Filter modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
              تصفية التوصيلات
            </Text>
            {(
              [
                { value: "all", label: "الكل" },
                { value: "pending", label: "قيد الانتظار" },
                { value: "accepted", label: "مبولة" },
                { value: "picked_up", label: "في الطريق" },
                { value: "delivered", label: "تم التسليم" },
                { value: "cancelled", label: "ملغاة" },
              ] as Array<{ value: DeliveryStatusFilter; label: string }>
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setShowFilters(false);
                }}
                style={[
                  styles.filterOpt,
                  {
                    borderColor: statusFilter === opt.value ? colors.primary : colors.borderSubtle,
                    backgroundColor: statusFilter === opt.value ? colors.primary + "18" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: statusFilter === opt.value ? colors.primary : colors.textPrimary,
                    textAlign: "right",
                    fontWeight: "600",
                    fontFamily: tokens.typography.families.arabic,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedDelivery && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    تفاصيل التوصيل #{selectedDelivery.id.slice(0, 8)}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>رقم الطلب المرتبط</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }} numberOfLines={1}>{selectedDelivery.order_id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>الحالة</Text>
                    <Text style={{ color: colors.primary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "700" }}>{STATUS_LABELS[selectedDelivery.status] ?? selectedDelivery.status}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>الموصل</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDelivery.driver?.full_name ?? "غير معين"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>هاتف الموصل</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDelivery.driver?.phone ?? "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>نوع المركبة</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDelivery.driver?.vehicle_type ?? "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>الزبون</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDelivery.order?.customer?.full_name ?? "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>المتجر</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDelivery.order?.store?.name ?? "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>وقت التعيين</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 12, textAlign: "right", flex: 2 }}>{new Date(selectedDelivery.assigned_at).toLocaleString("ar-DZ")}</Text>
                  </View>
                  {selectedDelivery.delivered_at && (
                    <View style={styles.infoRow}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>وقت التسليم</Text>
                      <Text style={{ color: colors.success, fontSize: 12, textAlign: "right", flex: 2 }}>{new Date(selectedDelivery.delivered_at).toLocaleString("ar-DZ")}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => setShowDetail(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.primary, borderRadius: tokens.radius.md }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 16,
  },
  filterOpt: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  detailScroll: {
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row-reverse",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.1)",
  },
  closeBtn: {
    padding: 14,
    marginBottom: 30,
  },
});
