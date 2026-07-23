import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, ScrollView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Plus, Filter, Search } from "lucide-react-native";
import {
  AdminPageShell, AdminListItem,
  AdminLoadingState, AdminEmptyState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderCustomers, type FounderCustomer,
} from "@/services/founder-users.service";
import { useRealtimeUserList } from "@/hooks/useRealtimeUserList";

type CustomerStatus = "all" | "active" | "suspended" | "banned";

const STATUS_OPTS: Array<{ value: CustomerStatus; label: string; color?: string }> = [
  { value: "all",       label: "الكل" },
  { value: "active",    label: "نشط",    color: "#00C853" },
  { value: "suspended", label: "موقوف",  color: "#FFD600" },
  { value: "banned",    label: "محظور",  color: "#D50000" },
];

const STATUS_COLORS: Record<string, string> = {
  active:    "#00C853",
  suspended: "#FFD600",
  banned:    "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  active:    "نشط",
  suspended: "موقوف",
  banned:    "محظور",
};

export default function FounderCustomersScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(
    async (q?: string, status?: CustomerStatus, refresh = false, incDeleted = false) => {
      if (refresh) setRefreshing(true); else setLoading(true);
      setError(null);
      try {
        const data = await getFounderCustomers(q, status === "all" ? undefined : status, incDeleted);
        setItems(data);
      } catch {
        setError("تعذّر تحميل بيانات الزبائن");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => { load("", statusFilter, false, showDeleted); }, [load, statusFilter, showDeleted]);

  useRealtimeUserList("customers", () => {
    load(search, statusFilter, true, showDeleted);
  });

  const handleSearch = () => load(search, statusFilter, false, showDeleted);

  const navigate = (id: string) =>
    router.push(`/founder/users/customer-detail?id=${id}` as never);

  return (
    <AdminPageShell showLogout title="الزبائن" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Search + filter bar */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              placeholder="بحث بالاسم..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={handleSearch}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[
              styles.iconBtn,
              {
                backgroundColor: showFilters ? colors.primary + "22" : colors.bgElevated,
                borderColor: showFilters ? colors.primary : colors.borderSubtle,
              },
            ]}
          >
            <Filter size={18} color={showFilters ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/founder/users/create?role=customer" as never)}
            style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Active filters summary */}
        {(statusFilter !== "all" || showDeleted) && (
          <View style={[styles.filterSummary, { paddingHorizontal: tokens.spacing.lg }]}>
            {statusFilter !== "all" && (
              <View style={[styles.filterChip, { backgroundColor: (STATUS_COLORS[statusFilter] ?? colors.primary) + "22", borderColor: (STATUS_COLORS[statusFilter] ?? colors.primary) + "44" }]}>
                <Text style={{ color: STATUS_COLORS[statusFilter] ?? colors.primary, fontSize: 12 }}>
                  {STATUS_LABELS[statusFilter] ?? statusFilter}
                </Text>
              </View>
            )}
            {showDeleted && (
              <View style={[styles.filterChip, { backgroundColor: colors.error + "22", borderColor: colors.error + "44" }]}>
                <Text style={{ color: colors.error, fontSize: 12 }}>يشمل المحذوفين</Text>
              </View>
            )}
          </View>
        )}

        {/* List */}
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => load(search, statusFilter, false, showDeleted)} />
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
            ListEmptyComponent={<AdminEmptyState message="لا يوجد زبائن" />}
            renderItem={({ item }) => {
              return (
                <AdminListItem
                  title={item.full_name || "زبون بدون اسم"}
                  subtitle={`${item.phone}${item.is_gold_member ? " 🥇" : ""}${item.is_demo ? " 🔒 تجريبي" : ""}`}
                  badge={
                    item.deleted_at
                      ? "محذوف"
                      : STATUS_LABELS[item.status] ?? item.status
                  }
                  badgeColor={
                    item.deleted_at
                      ? colors.textDisabled
                      : STATUS_COLORS[item.status] ?? colors.primary
                  }
                  onPress={() => navigate(item.id)}
                />
              );
            }}
          />
        )}
      </View>

      {/* Filters modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية الزبائن</Text>

            <Text style={{ color: colors.textSecondary, textAlign: "right", marginBottom: 8, fontSize: 13 }}>الحالة</Text>
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

            <View style={[styles.toggleRow, { borderColor: colors.borderSubtle, marginTop: 16 }]}>
              <TouchableOpacity
                onPress={() => { setShowDeleted(!showDeleted); setShowFilters(false); }}
                style={[
                  styles.toggleBtn,
                  { backgroundColor: showDeleted ? colors.error + "22" : "transparent", borderColor: showDeleted ? colors.error : colors.borderSubtle },
                ]}
              >
                <Text style={{ color: showDeleted ? colors.error : colors.textSecondary, fontWeight: "600" }}>
                  {showDeleted ? "✓ يشمل المحذوفين" : "إظهار المحذوفين"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 16, alignItems: "center" }}>
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
  filterSummary: { flexDirection: "row-reverse", gap: 6, paddingTop: 8 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 6 },
  sheetTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 12 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
  toggleRow: { borderTopWidth: 1, paddingTop: 12 },
  toggleBtn: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: "center" },
});
