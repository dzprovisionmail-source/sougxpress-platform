import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Plus, Filter } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { supabase } from "@/lib/supabase";

interface Category {
  id: string;
  name: string;
  status?: string;
}

async function getCategories(search?: string): Promise<{ data: Category[]; error: string | null }> {
  let query = supabase
    .from("categories")
    .select("id, name, status")
    .order("name", { ascending: true })
    .limit(100);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  return {
    data: (data ?? []) as Category[],
    error: error?.message ?? null,
  };
}

export default function AdminCategoriesScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getCategories(q || undefined);
    setItems(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="الفئات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Search + filter row */}
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث عن فئة..."
            placeholderTextColor={colors.textDisabled}
            textAlign="right"
            returnKeyType="search"
            style={[styles.input, {
              backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle,
              color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.base, borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md, flex: 1,
            }]}
          />
          <TouchableOpacity
            onPress={() => load(search)}
            style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.md }]}
          >
            <Filter color={colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>

        {/* Unavailable note */}
        {!loading && error && (
          <View style={[styles.note, { margin: tokens.spacing.lg, backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.md }]}>
            <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right" }}>
              جدول الفئات غير متاح حالياً — يتطلب إنشاء جدول categories في قاعدة البيانات
            </Text>
          </View>
        )}

        {loading ? (
          <AdminLoadingState message="جاري تحميل الفئات..." />
        ) : error ? (
          <AdminEmptyState message="لا توجد فئات مسجّلة حالياً" />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا توجد فئات مسجّلة حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => (
              <AdminListItem
                title={item.name}
                badge={item.status ?? "نشط"}
                badgeColor={item.status === "inactive" ? colors.textDisabled : colors.success}
              />
            )}
          />
        )}
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row-reverse", gap: 10 },
  input: { borderWidth: 1, writingDirection: "rtl" },
  iconBtn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  note: { borderWidth: 1 },
});
