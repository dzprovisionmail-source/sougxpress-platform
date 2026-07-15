import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Filter } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState } from "@/components/admin";
import { supabase } from "@/lib/supabase";

interface Promotion {
  id: string;
  code?: string;
  title?: string;
  discount_type?: string;
  status?: string;
  created_at?: string;
}

async function getPromotions(search?: string): Promise<{ data: Promotion[]; error: string | null }> {
  let query = supabase
    .from("promotions")
    .select("id, code, title, discount_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("code", `%${search}%`);
  }

  const { data, error } = await query;
  return {
    data: (data ?? []) as Promotion[],
    error: error?.message ?? null,
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  expired: "منتهي",
  paused: "موقوف",
  scheduled: "مجدول",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#00C853",
  expired: "#B0B0B0",
  paused: "#FFD600",
  scheduled: "#2979FF",
};

export default function AdminPromotionsScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const { data, error } = await getPromotions(q || undefined);
    if (error) setUnavailable(true);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="العروض والترويج" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث برمز العرض..."
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

        {unavailable && (
          <View style={[styles.note, { margin: tokens.spacing.lg, backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.md }]}>
            <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", lineHeight: 22 }}>
              جدول العروض غير متاح حالياً — يتطلب إنشاء جدول promotions في قاعدة البيانات
            </Text>
          </View>
        )}

        {loading ? (
          <AdminLoadingState message="جاري تحميل العروض..." />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا توجد عروض مسجّلة حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => {
              const status = item.status ?? "active";
              return (
                <AdminListItem
                  title={item.code ?? item.title ?? "عرض"}
                  subtitle={item.discount_type ?? undefined}
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
  input: { borderWidth: 1, writingDirection: "rtl" },
  iconBtn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  note: { borderWidth: 1 },
});
