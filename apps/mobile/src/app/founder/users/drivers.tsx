import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal,
} from "react-native";
import { router } from "expo-router";
import { Plus, Filter, Search } from "lucide-react-native";
import {
  AdminPageShell, AdminListItem,
  AdminLoadingState, AdminEmptyState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderDrivers, type FounderDriver,
} from "@/services/founder-users.service";
import { useRealtimeUserList } from "@/hooks/useRealtimeUserList";

type DriverStatus = "all" | "pending_review" | "active" | "suspended" | "offline";

const STATUS_OPTS: Array<{ value: DriverStatus; label: string; color?: string }> = [
  { value: "all",            label: "الكل" },
  { value: "pending_review", label: "ينتظر الموافقة", color: "#FFD600" },
  { value: "active",         label: "نشط",            color: "#00C853" },
  { value: "offline",        label: "غير متصل",       color: "#64748B" },
  { value: "suspended",      label: "موقوف",           color: "#D50000" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "#FFD600",
  active:         "#00C853",
  offline:        "#64748B",
  suspended:      "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  pending_review: "ينتظر",
  active:         "نشط",
  offline:        "غير متصل",
  suspended:      "موقوف",
};

export default function FounderDriversScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(
    async (q?: string, status?: DriverStatus, refresh = false, incDeleted = false) => {
      if (refresh) setRefreshing(true); else setLoading(true);
      setError(null);
      try {
        const data = await getFounderDrivers(q, status === "all" ? undefined : status, incDeleted);
        setItems(data);
      } catch {
        setError("تعذّر تحميل بيانات الموصلين");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => { load("", statusFilter, false, showDeleted); }, [load, statusFilter, showDeleted]);

  useRealtimeUserList("drivers", () => {
    load(search, statusFilter, true, showDeleted);
  });

  return (
    <AdminPageShell title="الموصلون" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => load(search, statusFilter, false, showDeleted)}
              placeholder="بحث بالاسم..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={() => load(search, statusFilter, false, showDeleted)}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
          >
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/founder/users/create?role=driver" as never)}
            style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => load(search, statusFilter)} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{
              paddingHorizontal: tokens.spacing.lg,
              paddingTop: tokens.spacing.md,
              paddingBottom: 80,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(search, statusFilter, true, showDeleted)}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={<AdminEmptyState message="لا يوجد موصلون" />}
            renderItem={({ item }) => (
              <AdminListItem
                title={item.full_name || item.email}
                subtitle={`${item.phone}${item.vehicle_type ? ` · ${item.vehicle_type}` : ""}`}
                badge={item.deleted_at ? "محذوف" : STATUS_LABELS[item.status] ?? item.status}
                badgeColor={item.deleted_at ? colors.textDisabled : STATUS_COLORS[item.status] ?? colors.primary}
                onPress={() => router.push(`/founder/users/driver-detail?id=${item.id}` as never)}
              />
            )}
          />
        )}
      </View>

      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية الموصلين</Text>
            {STATUS_OPTS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setStatusFilter(opt.value); setShowFilters(false); }}
                style={[
                  styles.filterOpt,
                  {
                    borderColor: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.borderSubtle,
                    backgroundColor: statusFilter === opt.value ? (opt.color ?? colors.primary) + "18" : "transparent",
                  },
                ]}
              >
                <Text style={{ color: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { setShowDeleted(!showDeleted); setShowFilters(false); }}
              style={[styles.filterOpt, { borderColor: showDeleted ? colors.error : colors.borderSubtle, backgroundColor: showDeleted ? colors.error + "18" : "transparent", marginTop: 8 }]}
            >
              <Text style={{ color: showDeleted ? colors.error : colors.textSecondary, textAlign: "right", fontWeight: "600" }}>
                {showDeleted ? "✓ يشمل المحذوفين" : "إظهار المحذوفين"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  searchWrap: { flex: 1, flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  searchInput: { flex: 1, textAlign: "right" },
  iconBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 6 },
  sheetTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 12 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
});
