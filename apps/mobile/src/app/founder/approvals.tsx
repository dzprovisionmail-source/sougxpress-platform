import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { CheckCircle, XCircle, Clock, ChevronRight, Users, Truck, Search, Filter } from "lucide-react-native";

import { FounderPageShell, AdminListItem, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderMerchants,
  getFounderDrivers,
  setFounderMerchantStatus,
  setFounderDriverStatus,
  type FounderMerchant,
  type FounderDriver,
} from "@/services/founder-users.service";

type TabKey = "merchants" | "drivers";
type MerchantStatus = "all" | "pending_review" | "active" | "suspended" | "rejected";
type DriverStatus = "all" | "pending_review" | "active" | "suspended" | "offline";

const MERCHANT_STATUS_OPTS: Array<{ value: MerchantStatus; label: string; color?: string }> = [
  { value: "all", label: "الكل" },
  { value: "pending_review", label: "ينتظر الموافقة", color: "#FFD600" },
  { value: "active", label: "نشط", color: "#00C853" },
  { value: "suspended", label: "موقوف", color: "#FF8A00" },
  { value: "rejected", label: "مرفوض", color: "#D50000" },
];

const DRIVER_STATUS_OPTS: Array<{ value: DriverStatus; label: string; color?: string }> = [
  { value: "all", label: "الكل" },
  { value: "pending_review", label: "ينتظر الموافقة", color: "#FFD600" },
  { value: "active", label: "نشط", color: "#00C853" },
  { value: "suspended", label: "موقوف", color: "#FF8A00" },
  { value: "offline", label: "غير متصل", color: "#64748B" },
];

const MERCHANT_STATUS_COLORS: Record<string, string> = {
  pending_review: "#FFD600", active: "#00C853", suspended: "#FF8A00", rejected: "#D50000",
};
const DRIVER_STATUS_COLORS: Record<string, string> = {
  pending_review: "#FFD600", active: "#00C853", suspended: "#FF8A00", offline: "#64748B",
};
const MERCHANT_STATUS_LABELS: Record<string, string> = {
  pending_review: "ينتظر", active: "نشط", suspended: "موقوف", rejected: "مرفوض",
};
const DRIVER_STATUS_LABELS: Record<string, string> = {
  pending_review: "ينتظر", active: "نشط", suspended: "موقوف", offline: "غير متصل",
};

export default function FounderApprovalsScreen() {
  const { colors, tokens } = useAppTheme();
  const [tab, setTab] = useState<TabKey>("merchants");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchants state
  const [merchants, setMerchants] = useState<FounderMerchant[]>([]);
  const [mSearch, setMSearch] = useState("");
  const [mStatus, setMStatus] = useState<MerchantStatus>("pending_review");
  const [mShowDeleted, setMShowDeleted] = useState(false);
  const [mShowFilters, setMShowFilters] = useState(false);
  const [mSelected, setMSelected] = useState<Set<string>>(new Set());

  // Drivers state
  const [drivers, setDrivers] = useState<FounderDriver[]>([]);
  const [dSearch, setDSearch] = useState("");
  const [dStatus, setDStatus] = useState<DriverStatus>("pending_review");
  const [dShowDeleted, setDShowDeleted] = useState(false);
  const [dShowFilters, setDFilters] = useState(false);
  const [dSelected, setDSelected] = useState<Set<string>>(new Set());

  const [batchLoading, setBatchLoading] = useState(false);

  const loadMerchants = useCallback(async (q?: string, status?: MerchantStatus, refresh = false, incDeleted = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getFounderMerchants(q, status === "all" ? undefined : status, incDeleted);
      setMerchants(data);
    } catch { setError("تعذّر تحميل بيانات التجار"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadDrivers = useCallback(async (q?: string, status?: DriverStatus, refresh = false, incDeleted = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getFounderDrivers(q, status === "all" ? undefined : status, incDeleted);
      setDrivers(data);
    } catch { setError("تعذّر تحميل بيانات الموصلين"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadMerchants(mSearch, mStatus, false, mShowDeleted); }, [loadMerchants, mSearch, mStatus, mShowDeleted]);
  useEffect(() => { loadDrivers(dSearch, dStatus, false, dShowDeleted); }, [loadDrivers, dSearch, dStatus, dShowDeleted]);

  const toggleMerchantSelection = (id: string) => {
    setMSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDriverSelection = (id: string) => {
    setDSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const batchApproveMerchants = async () => {
    if (mSelected.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all([...mSelected].map(id => setFounderMerchantStatus(id, "active")));
      setMSelected(new Set());
      loadMerchants(mSearch, mStatus, true, mShowDeleted);
    } finally { setBatchLoading(false); }
  };

  const batchRejectMerchants = async () => {
    if (mSelected.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all([...mSelected].map(id => setFounderMerchantStatus(id, "rejected")));
      setMSelected(new Set());
      loadMerchants(mSearch, mStatus, true, mShowDeleted);
    } finally { setBatchLoading(false); }
  };

  const batchApproveDrivers = async () => {
    if (dSelected.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all([...dSelected].map(id => setFounderDriverStatus(id, "active")));
      setDSelected(new Set());
      loadDrivers(dSearch, dStatus, true, dShowDeleted);
    } finally { setBatchLoading(false); }
  };

  const batchRejectDrivers = async () => {
    if (dSelected.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all([...dSelected].map(id => setFounderDriverStatus(id, "rejected")));
      setDSelected(new Set());
      loadDrivers(dSearch, dStatus, true, dShowDeleted);
    } finally { setBatchLoading(false); }
  };

  const pendingMerchantsCount = merchants.filter(m => m.status === "pending_review" && !m.deleted_at).length;
  const pendingDriversCount = drivers.filter(d => d.status === "pending_review" && !d.deleted_at).length;

  if (loading && !refreshing) {
    return (
      <FounderPageShell title="مركز العمليات والموافقات" showBack>
        <AdminLoadingState message="جاري تحميل طلبات الموافقة..." />
      </FounderPageShell>
    );
  }

  if (error && !merchants.length && !drivers.length) {
    return (
      <FounderPageShell title="مركز العمليات والموافقات" showBack>
        <AdminErrorState message={error} onRetry={() => { tab === "merchants" ? loadMerchants(mSearch, mStatus) : loadDrivers(dSearch, dStatus); }} />
      </FounderPageShell>
    );
  }

  return (
    <FounderPageShell title="مركز العمليات والموافقات" showBack scrollable={false}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.bgElevated, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          onPress={() => { setTab("merchants"); setMSelected(new Set()); }}
          style={[styles.tab, tab === "merchants" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
        >
          <Users size={18} color={tab === "merchants" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: tab === "merchants" ? colors.primary : colors.textSecondary }]}>
            تجار ({pendingMerchantsCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setTab("drivers"); setDSelected(new Set()); }}
          style={[styles.tab, tab === "drivers" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
        >
          <Truck size={18} color={tab === "drivers" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: tab === "drivers" ? colors.primary : colors.textSecondary }]}>
            موصلون ({pendingDriversCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Batch actions */}
      {tab === "merchants" && mSelected.size > 0 && (
        <View style={[styles.batchBar, { backgroundColor: colors.primary + "12", borderBottomColor: colors.borderSubtle }]}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 1, paddingHorizontal: 12 }}>
            تم تحديد {mSelected.size}
          </Text>
          <TouchableOpacity onPress={batchApproveMerchants} disabled={batchLoading} style={[styles.batchBtn, { backgroundColor: colors.success + "18" }]}>
            {batchLoading ? <ActivityIndicator size="small" color={colors.success} /> : <CheckCircle size={18} color={colors.success} />}
            <Text style={[styles.batchLabel, { color: colors.success }]}>موافقة</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={batchRejectMerchants} disabled={batchLoading} style={[styles.batchBtn, { backgroundColor: colors.error + "18" }]}>
            {batchLoading ? <ActivityIndicator size="small" color={colors.error} /> : <XCircle size={18} color={colors.error} />}
            <Text style={[styles.batchLabel, { color: colors.error }]}>رفض</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMSelected(new Set())} style={{ padding: 8 }}>
            <Text style={{ color: colors.textSecondary }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "drivers" && dSelected.size > 0 && (
        <View style={[styles.batchBar, { backgroundColor: colors.primary + "12", borderBottomColor: colors.borderSubtle }]}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 1, paddingHorizontal: 12 }}>
            تم تحديد {dSelected.size}
          </Text>
          <TouchableOpacity onPress={batchApproveDrivers} disabled={batchLoading} style={[styles.batchBtn, { backgroundColor: colors.success + "18" }]}>
            {batchLoading ? <ActivityIndicator size="small" color={colors.success} /> : <CheckCircle size={18} color={colors.success} />}
            <Text style={[styles.batchLabel, { color: colors.success }]}>موافقة</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={batchRejectDrivers} disabled={batchLoading} style={[styles.batchBtn, { backgroundColor: colors.error + "18" }]}>
            {batchLoading ? <ActivityIndicator size="small" color={colors.error} /> : <XCircle size={18} color={colors.error} />}
            <Text style={[styles.batchLabel, { color: colors.error }]}>رفض</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDSelected(new Set())} style={{ padding: 8 }}>
            <Text style={{ color: colors.textSecondary }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search + filter bar */}
      {tab === "merchants" && (
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={mSearch}
              onChangeText={setMSearch}
              onSubmitEditing={() => loadMerchants(mSearch, mStatus)}
              placeholder="بحث باسم التجارة..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={() => loadMerchants(mSearch, mStatus)}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setMShowFilters(true)} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/founder/users/create?role=merchant" as never)} style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "drivers" && (
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={dSearch}
              onChangeText={setDSearch}
              onSubmitEditing={() => loadDrivers(dSearch, dStatus)}
              placeholder="بحث بالاسم..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={() => loadDrivers(dSearch, dStatus)}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setDFilters(true)} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/founder/users/create?role=driver" as never)} style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {tab === "merchants" && (
        <FlatList
          data={merchants}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMerchants(mSearch, mStatus, true, mShowDeleted)} tintColor={colors.primary} />}
          ListEmptyComponent={<AdminEmptyState message="لا يوجد تجار في هذه الفئة" />}
          renderItem={({ item }) => {
            const pending = item.status === "pending_review" && !item.deleted_at;
            return (
              <TouchableOpacity onPress={() => router.push(`/founder/users/merchant-detail?id=${item.id}` as never)}>
                <View style={[styles.listItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginBottom: tokens.spacing.sm, flexDirection: "row-reverse", alignItems: "center", gap: 12 }]}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "600", textAlign: "right" }}>{item.business_name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.xs, textAlign: "right" }}>{item.phone} · {item.owner_full_name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: (item.deleted_at ? colors.textDisabled : MERCHANT_STATUS_COLORS[item.status] ?? colors.primary) + "18", borderColor: (item.deleted_at ? colors.textDisabled : MERCHANT_STATUS_COLORS[item.status] ?? colors.primary) + "44" }]}>
                    <Text style={{ color: item.deleted_at ? colors.textDisabled : MERCHANT_STATUS_COLORS[item.status] ?? colors.primary, fontSize: 11, fontWeight: "700" }}>
                      {item.deleted_at ? "محذوف" : MERCHANT_STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                  {pending && (
                    <TouchableOpacity onPress={() => toggleMerchantSelection(item.id)} style={{ padding: 4 }}>
                      <View style={[styles.checkbox, { borderColor: mSelected.has(item.id) ? colors.primary : colors.borderSubtle, backgroundColor: mSelected.has(item.id) ? colors.primary : "transparent" }]}>
                        {mSelected.has(item.id) && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {tab === "drivers" && (
        <FlatList
          data={drivers}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDrivers(dSearch, dStatus, true, dShowDeleted)} tintColor={colors.primary} />}
          ListEmptyComponent={<AdminEmptyState message="لا يوجد موصلون في هذه الفئة" />}
          renderItem={({ item }) => {
            const pending = item.status === "pending_review" && !item.deleted_at;
            return (
              <TouchableOpacity onPress={() => router.push(`/founder/users/driver-detail?id=${item.id}` as never)}>
                <View style={[styles.listItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginBottom: tokens.spacing.sm, flexDirection: "row-reverse", alignItems: "center", gap: 12 }]}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "600", textAlign: "right" }}>{item.full_name || item.email}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.xs, textAlign: "right" }}>{item.phone} {item.vehicle_type ? `· ${item.vehicle_type}` : ""}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: (item.deleted_at ? colors.textDisabled : DRIVER_STATUS_COLORS[item.status] ?? colors.primary) + "18", borderColor: (item.deleted_at ? colors.textDisabled : DRIVER_STATUS_COLORS[item.status] ?? colors.primary) + "44" }]}>
                    <Text style={{ color: item.deleted_at ? colors.textDisabled : DRIVER_STATUS_COLORS[item.status] ?? colors.primary, fontSize: 11, fontWeight: "700" }}>
                      {item.deleted_at ? "محذوف" : DRIVER_STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                  {pending && (
                    <TouchableOpacity onPress={() => toggleDriverSelection(item.id)} style={{ padding: 4 }}>
                      <View style={[styles.checkbox, { borderColor: dSelected.has(item.id) ? colors.primary : colors.borderSubtle, backgroundColor: dSelected.has(item.id) ? colors.primary : "transparent" }]}>
                        {dSelected.has(item.id) && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Merchant filters modal */}
      <Modal visible={mShowFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية التجار</Text>
            {MERCHANT_STATUS_OPTS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => { setMStatus(opt.value); setMShowFilters(false); }} style={[styles.filterOpt, { borderColor: mStatus === opt.value ? (opt.color ?? colors.primary) : colors.borderSubtle, backgroundColor: mStatus === opt.value ? (opt.color ?? colors.primary) + "18" : "transparent" }]}>
                <Text style={{ color: mStatus === opt.value ? (opt.color ?? colors.primary) : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => { setMShowDeleted(!mShowDeleted); setMShowFilters(false); }} style={[styles.filterOpt, { borderColor: mShowDeleted ? colors.error : colors.borderSubtle, backgroundColor: mShowDeleted ? colors.error + "18" : "transparent", marginTop: 8 }]}>
              <Text style={{ color: mShowDeleted ? colors.error : colors.textSecondary, textAlign: "right", fontWeight: "600" }}>{mShowDeleted ? "✓ يشمل المحذوفين" : "إظهار المحذوفين"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إغلاق</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Driver filters modal */}
      <Modal visible={dShowFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية الموصلين</Text>
            {DRIVER_STATUS_OPTS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => { setDStatus(opt.value); setDFilters(false); }} style={[styles.filterOpt, { borderColor: dStatus === opt.value ? (opt.color ?? colors.primary) : colors.borderSubtle, backgroundColor: dStatus === opt.value ? (opt.color ?? colors.primary) + "18" : "transparent" }]}>
                <Text style={{ color: dStatus === opt.value ? (opt.color ?? colors.primary) : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => { setDShowDeleted(!dShowDeleted); setDFilters(false); }} style={[styles.filterOpt, { borderColor: dShowDeleted ? colors.error : colors.borderSubtle, backgroundColor: dShowDeleted ? colors.error + "18" : "transparent", marginTop: 8 }]}>
              <Text style={{ color: dShowDeleted ? colors.error : colors.textSecondary, textAlign: "right", fontWeight: "600" }}>{dShowDeleted ? "✓ يشمل المحذوفين" : "إظهار المحذوفين"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDFilters(false)} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إغلاق</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </FounderPageShell>
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
  batchBar: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  batchBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  batchLabel: { fontSize: 12, fontWeight: "700" },
  listItem: { borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 6 },
  sheetTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 12 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
});
