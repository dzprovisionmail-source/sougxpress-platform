import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState } from "@/components/admin";
import { supabase } from "@/lib/supabase";

interface Subscription {
  id: string;
  merchant_id?: string;
  plan?: string;
  status?: string;
  created_at?: string;
}

async function getSubscriptions(): Promise<{ data: Subscription[]; error: string | null }> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, merchant_id, plan, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return {
    data: (data ?? []) as Subscription[],
    error: error?.message ?? null,
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغى",
  trial: "تجريبي",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#00C853",
  expired: "#D50000",
  cancelled: "#B0B0B0",
  trial: "#FFD600",
};

export default function AdminSubscriptionsScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSubscriptions();
    if (error) setUnavailable(true);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="الاشتراكات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {loading ? (
          <AdminLoadingState message="جاري تحميل الاشتراكات..." />
        ) : unavailable || items.length === 0 ? (
          <View style={{ flex: 1 }}>
            {unavailable && (
              <View style={[styles.note, { margin: tokens.spacing.lg, backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.md }]}>
                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", lineHeight: 22 }}>
                  جدول الاشتراكات غير متاح حالياً — يتطلب إنشاء جدول subscriptions في قاعدة البيانات
                </Text>
              </View>
            )}
            <AdminEmptyState message="لا توجد اشتراكات مسجّلة حالياً" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => {
              const status = item.status ?? "active";
              return (
                <AdminListItem
                  title={item.plan ?? "اشتراك"}
                  subtitle={item.merchant_id ? `تاجر: ${String(item.merchant_id).slice(0, 8)}` : undefined}
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
  note: { borderWidth: 1 },
});
