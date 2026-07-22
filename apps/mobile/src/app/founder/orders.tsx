import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Search, Filter, Clock, MapPin, User, Truck, XCircle, CheckCircle, RotateCcw, ChevronLeft, X } from "lucide-react-native";
import {
  AdminPageShell, AdminListItem, AdminStatCard,
  AdminLoadingState, AdminEmptyState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderOrders, getFounderOrder, updateFounderOrderStatus, reassignFounderOrderDriver,
  getFounderDriversForReassignment,
  type FounderOrder, type FounderOrderItem, type FounderOrderTimelineEntry,
} from "@/services/founder-orders.service";

type TabKey = "live" | "history";
type OrderStatusFilter = "all" | "pending" | "accepted" | "preparing" | "ready_for_pickup" | "picked_up" | "delivered" | "cancelled" | "disputed";

const LIVE_STATUSES = ["pending", "accepted", "preparing", "ready_for_pickup", "picked_up"];
const HISTORY_STATUSES = ["delivered", "cancelled", "disputed"];

const STATUS_OPTS: Array<{ value: OrderStatusFilter; label: string; color?: string }> = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "قيد الانتظار", color: "#FFD600" },
  { value: "accepted", label: "مقبول", color: "#00C853" },
  { value: "preparing", label: "قيد التحضير", color: "#2196F3" },
  { value: "ready_for_pickup", label: "جاهز للاستلام", color: "#9C27B0" },
  { value: "picked_up", label: "في الطريق", color: "#FF8A00" },
  { value: "delivered", label: "تم التسليم", color: "#00C853" },
  { value: "cancelled", label: "ملغى", color: "#D50000" },
  { value: "disputed", label: "نزاع", color: "#D50000" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFD600", accepted: "#00C853", preparing: "#2196F3", ready_for_pickup: "#9C27B0",
  picked_up: "#FF8A00", delivered: "#00C853", cancelled: "#D50000", disputed: "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", accepted: "مقبول", preparing: "قيد التحضير", ready_for_pickup: "جاهز",
  picked_up: "في الطريق", delivered: "تم التسليم", cancelled: "ملغى", disputed: "نزاع",
};

export default function FounderOrdersScreen() {
  const { colors, tokens } = useAppTheme();
  const [tab, setTab] = useState<TabKey>("live");
  const [items, setItems] = useState<FounderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<{
    order: FounderOrder;
    items: FounderOrderItem[];
    timeline: FounderOrderTimelineEntry[];
  } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [driversList, setDriversList] = useState<Array<{ id: string; full_name: string; phone: string; vehicle_type: string | null; status: string }>>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const loadOrders = useCallback(async (q?: string, status?: OrderStatusFilter, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const effectiveStatus = status === "all" ? undefined : status;
      const data = await getFounderOrders(q, effectiveStatus);
      const filtered = tab === "live"
        ? data.filter((o) => LIVE_STATUSES.includes(o.status))
        : data.filter((o) => HISTORY_STATUSES.includes(o.status));
      setItems(filtered);
    } catch {
      setError("تعذّر تحميل الطلبات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { loadOrders(search, statusFilter); }, [loadOrders, search, statusFilter]);

  const openDetail = async (order: FounderOrder) => {
    setLoading(true);
    const res = await getFounderOrder(order.id);
    setLoading(false);
    if (res.error || !res.order) {
      Alert.alert("خطأ", res.error ?? "الطلب غير موجود");
      return;
    }
    setSelectedOrder({ order: res.order, items: res.items, timeline: res.timeline });
    setShowDetail(true);
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    await updateFounderOrderStatus(selectedOrder.order.id, "cancelled", cancelReason || "ألغى المؤسس");
    setActionLoading(false);
    setShowCancelModal(false);
    setShowDetail(false);
    loadOrders(search, statusFilter, true);
  };

  const handleReassign = async (driverId: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    await reassignFounderOrderDriver(selectedOrder.order.id, driverId);
    setActionLoading(false);
    setShowReassignModal(false);
    setShowDetail(false);
    loadOrders(search, statusFilter, true);
  };

  const openReassign = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    const drivers = await getFounderDriversForReassignment();
    setDriversList(drivers);
    setActionLoading(false);
    setShowReassignModal(true);
  };

  const fmtMinor = (minor: number) => `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="الطلبات" showBack>
        <AdminLoadingState message="جاري تحميل الطلبات..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="الطلبات" showBack>
        <AdminErrorState message={error} onRetry={() => loadOrders(search, statusFilter)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="الطلبات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.bgElevated, borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity
            onPress={() => { setTab("live"); setStatusFilter("all"); }}
            style={[styles.tab, tab === "live" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabLabel, { color: tab === "live" ? colors.primary : colors.textSecondary }]}>نشطة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setTab("history"); setStatusFilter("all"); }}
            style={[styles.tab, tab === "history" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabLabel, { color: tab === "history" ? colors.primary : colors.textSecondary }]}>السجل</Text>
          </TouchableOpacity>
        </View>

        {/* Search + filter bar */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadOrders(search, statusFilter)}
              placeholder="بحث برقم الطلب..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={() => loadOrders(search, statusFilter)}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label={tab === "live" ? "نشطة" : "مكتملة"} value={items.filter(i => i.status === (tab === "live" ? "pending" : "delivered")).length} accent={colors.primary} style={{ flex: 1 }} />
          <AdminStatCard label="الإجمالي" value={items.length} accent={colors.secondary} style={{ flex: 1 }} />
        </View>

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(search, statusFilter, true)} tintColor={colors.primary} />}
          ListEmptyComponent={<AdminEmptyState message={tab === "live" ? "لا توجد طلبات نشطة" : "لا توجد طلبات في السجل"} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openDetail(item)}>
              <View style={[styles.listItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginBottom: tokens.spacing.sm, flexDirection: "row-reverse", alignItems: "center", gap: 12 }]}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "600", textAlign: "right" }} numberOfLines={1}>
                    {item.store?.name ?? "متجر"} · {item.customer?.full_name ?? "زبون"}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.xs, textAlign: "right" }}>
                    {STATUS_LABELS[item.status] ?? item.status} · {fmtMinor(item.order_total_minor ?? item.total_minor ?? 0)}
                  </Text>
                  {item.driver && <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right" }}>الموصل: {item.driver.full_name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] ?? colors.primary) + "18", borderColor: (STATUS_COLORS[item.status] ?? colors.primary) + "44" }]}>
                  <Text style={{ color: STATUS_COLORS[item.status] ?? colors.primary, fontSize: 11, fontWeight: "700" }}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
                <ChevronLeft size={16} color={colors.textDisabled} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Filters modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية الطلبات</Text>
            {STATUS_OPTS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => { setStatusFilter(opt.value); setShowFilters(false); }} style={[styles.filterOpt, { borderColor: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.borderSubtle, backgroundColor: statusFilter === opt.value ? (opt.color ?? colors.primary) + "18" : "transparent" }]}>
                <Text style={{ color: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إغلاق</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Order detail modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedOrder && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1 }} numberOfLines={1}>
                    {selectedOrder.order.store?.name ?? "متجر"} — {selectedOrder.order.customer?.full_name ?? "زبون"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>رقم الطلب</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }} numberOfLines={1}>{selectedOrder.order.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>الحالة</Text>
                    <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[selectedOrder.order.status] ?? colors.primary) + "18", borderColor: (STATUS_COLORS[selectedOrder.order.status] ?? colors.primary) + "44" }]}>
                      <Text style={{ color: STATUS_COLORS[selectedOrder.order.status] ?? colors.primary, fontSize: 12, fontWeight: "700" }}>{STATUS_LABELS[selectedOrder.order.status] ?? selectedOrder.order.status}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>الموصل</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedOrder.order.driver?.full_name ?? "غير معين"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>الإجمالي</Text>
                    <Text style={{ color: colors.primary, fontSize: 14, textAlign: "right", flex: 2, fontWeight: "700" }}>{fmtMinor(selectedOrder.order.order_total_minor ?? selectedOrder.order.total_minor ?? 0)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>العمولة</Text>
                    <Text style={{ color: colors.success, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{fmtMinor(selectedOrder.order.platform_commission_minor)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>التوصيل</Text>
                    <Text style={{ color: colors.info, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{fmtMinor(selectedOrder.order.delivery_fee_minor)}</Text>
                  </View>
                </View>

                {/* Timeline */}
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 16, marginBottom: 8 }}>الجدول الزمني</Text>
                {selectedOrder.timeline.length === 0 ? (
                  <Text style={{ color: colors.textDisabled, textAlign: "right", fontSize: 13 }}>لا يوجد سجل حالات</Text>
                ) : (
                  selectedOrder.timeline.map((t) => (
                    <View key={t.id} style={[styles.timelineItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                        <View style={[styles.timelineDot, { backgroundColor: STATUS_COLORS[t.status] ?? colors.primary }]} />
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 }}>{STATUS_LABELS[t.status] ?? t.status}</Text>
                        <Text style={{ color: colors.textDisabled, fontSize: 11, textAlign: "right" }}>{new Date(t.created_at).toLocaleString("ar-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", marginTop: 2 }}>
                        {t.changed_by_role === "founder" ? "المؤسس" : t.changed_by_role === "driver" ? "موصل" : t.changed_by_role === "merchant" ? "تاجر" : "نظام"}
                      </Text>
                    </View>
                  ))
                )}

                {/* Items */}
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 16, marginBottom: 8 }}>العناصر</Text>
                {selectedOrder.items.map((item) => (
                  <View key={item.id} style={[styles.itemRow, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 1 }} numberOfLines={1}>
                      منتج {item.product_id.slice(0, 8)} × {item.quantity}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right" }}>{fmtMinor(item.line_total_minor)}</Text>
                  </View>
                ))}

                {/* Actions */}
                {tab === "live" && (
                  <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 16 }}>
                    <TouchableOpacity onPress={openReassign} style={[styles.actionBtn, { backgroundColor: colors.info + "18", borderColor: colors.info + "44", flex: 1 }]}>
                      <Text style={{ color: colors.info, fontSize: 12, fontWeight: "700", textAlign: "center" }}>إعادة تعيين موصل</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCancelModal(true)} style={[styles.actionBtn, { backgroundColor: colors.error + "18", borderColor: colors.error + "44", flex: 1 }]}>
                      <Text style={{ color: colors.error, fontSize: 12, fontWeight: "700", textAlign: "center" }}>إلغاء</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {tab === "history" && selectedOrder.order.status === "cancelled" && (
                  <TouchableOpacity onPress={async () => { await updateFounderOrderStatus(selectedOrder.order.id, "pending"); setShowDetail(false); loadOrders(search, statusFilter, true); }} style={[styles.actionBtn, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "44" }]}>
                    <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "700", textAlign: "center" }}>إعادة للانتظار</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Cancel modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>تأكيد الإلغاء</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 12 }}>أدخل سبب الإلغاء (اختياري)</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="سبب الإلغاء..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
            />
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handleCancel} disabled={actionLoading} style={[styles.saveBtn, { backgroundColor: colors.error, flex: 1 }]}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>تأكيد الإلغاء</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCancelModal(false); setCancelReason(""); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassign modal */}
      <Modal visible={showReassignModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إعادة تعيين الموصل</Text>
            {actionLoading ? <ActivityIndicator color={colors.primary} /> : (
              driversList.map((d) => (
                <TouchableOpacity key={d.id} onPress={() => handleReassign(d.id)} style={[styles.filterOpt, { borderColor: colors.borderSubtle, marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, flex: 1 }}>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={{ color: colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{d.full_name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right" }}>{d.phone} {d.vehicle_type ? `· ${d.vehicle_type}` : ""}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: d.status === "active" ? colors.success + "18" : colors.textDisabled + "18", borderColor: d.status === "active" ? colors.success + "44" : colors.textDisabled + "44" }]}>
                      <Text style={{ color: d.status === "active" ? colors.success : colors.textDisabled, fontSize: 11, fontWeight: "700" }}>{d.status === "active" ? "نشط" : "غير متصل"}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setShowReassignModal(false)} style={{ marginTop: 8, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 4 },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  topBar: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  searchWrap: { flex: 1, flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  searchInput: { flex: 1, textAlign: "right" },
  iconBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  listItem: { borderWidth: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
  detailScroll: { maxHeight: "90%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, gap: 8, alignItems: "center" },
  actionBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  confirmBox: { borderWidth: 1, borderRadius: 16, padding: 24 },
  timelineItem: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8, gap: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  itemRow: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
});
