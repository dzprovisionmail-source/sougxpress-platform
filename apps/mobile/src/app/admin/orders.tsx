import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Filter } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { getAdminOrders } from "@/services/admin.service";

type OrderStatus = "pending" | "accepted" | "preparing" | "ready_for_pickup" | "picked_up" | "delivered" | "cancelled";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للتسليم",
  picked_up: "تم الاستلام",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#FFD600",
  accepted: "#2979FF",
  preparing: "#FF8A00",
  ready_for_pickup: "#FFAB40",
  picked_up: "#00BCD4",
  delivered: "#00C853",
  cancelled: "#D50000",
};

export default function AdminOrdersScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getAdminOrders(q || undefined);
    setItems(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatCurrency = (minor: unknown) => {
    const n = Number(minor);
    return isNaN(n) ? "—" : `${(n / 100).toFixed(2)} د.ج`;
  };

  return (
    <AdminPageShell title="الطلبات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث برقم الطلب..."
            placeholderTextColor={colors.textDisabled}
            textAlign="right"
            returnKeyType="search"
            style={[styles.searchInput, {
              backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle,
              color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.base, borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md, flex: 1,
            }]}
          />
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.md }]}
            onPress={() => load(search)}
          >
            <Filter color={colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <AdminLoadingState message="جاري تحميل الطلبات..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => load()} />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا توجد طلبات حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item["id"])}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => {
              const status = (item["status"] as OrderStatus) ?? "pending";
              const id = String(item["id"] ?? "").slice(0, 8);
              return (
                <AdminListItem
                  title={`طلب #${id}`}
                  subtitle={formatCurrency(item["total_minor"])}
                  badge={STATUS_LABELS[status] ?? status}
                  badgeColor={STATUS_COLORS[status] ?? colors.textSecondary}
                />
              );
            }}
          />
        )}
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row-reverse", gap: 10 },
  searchInput: { borderWidth: 1, writingDirection: "rtl" },
  filterBtn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
