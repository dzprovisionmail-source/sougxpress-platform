import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Filter } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState } from "@/components/admin";
import { supabase } from "@/lib/supabase";

interface LogEntry {
  id: string;
  action?: string;
  actor_id?: string;
  target_type?: string;
  created_at?: string;
}

async function getLogs(search?: string): Promise<{ data: LogEntry[]; error: string | null }> {
  let query = supabase
    .from("audit_logs")
    .select("id, action, actor_id, target_type, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("action", `%${search}%`);
  }

  const { data, error } = await query;
  return {
    data: (data ?? []) as LogEntry[],
    error: error?.message ?? null,
  };
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminLogsScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const { data, error } = await getLogs(q || undefined);
    if (error) setUnavailable(true);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="سجل العمليات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث في السجل..."
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
              جدول سجل العمليات غير متاح حالياً — يتطلب إنشاء جدول audit_logs في قاعدة البيانات
            </Text>
          </View>
        )}

        {loading ? (
          <AdminLoadingState message="جاري تحميل السجل..." />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا توجد عمليات مسجّلة حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => (
              <AdminListItem
                title={item.action ?? "عملية"}
                subtitle={formatDate(item.created_at)}
                badge={item.target_type ?? undefined}
                badgeColor={colors.secondary}
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
