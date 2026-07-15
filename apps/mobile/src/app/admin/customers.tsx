import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Filter } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { getAdminCustomers } from "@/services/admin.service";

type CustomerStatus = "active" | "suspended" | "banned";

const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  banned: "محظور",
};

const STATUS_COLORS: Record<CustomerStatus, string> = {
  active: "#00C853",
  suspended: "#FFD600",
  banned: "#D50000",
};

export default function AdminCustomersScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getAdminCustomers(q || undefined);
    setItems(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="الزبائن" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث عن زبون..."
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
          <AdminLoadingState message="جاري تحميل الزبائن..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => load()} />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا يوجد زبائن مسجّلون حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item["id"])}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => {
              const status = (item["status"] as CustomerStatus) ?? "active";
              return (
                <AdminListItem
                  title={String(item["full_name"] ?? "")}
                  subtitle={String(item["phone"] ?? "")}
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
