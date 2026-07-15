import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminListItem, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { getAdminZones } from "@/services/admin.service";

type ZoneStatus = "active" | "inactive" | "planned";

const STATUS_LABELS: Record<ZoneStatus, string> = {
  active: "نشط",
  inactive: "غير نشط",
  planned: "مخطط",
};

const STATUS_COLORS: Record<ZoneStatus, string> = {
  active: "#00C853",
  inactive: "#B0B0B0",
  planned: "#2979FF",
};

export default function AdminZonesScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getAdminZones();
    setItems(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminPageShell title="المناطق" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {loading ? (
          <AdminLoadingState message="جاري تحميل المناطق..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <AdminEmptyState message="لا توجد مناطق مسجّلة حالياً" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item["id"])}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            renderItem={({ item }) => {
              const status = (item["status"] as ZoneStatus) ?? "active";
              return (
                <AdminListItem
                  title={String(item["name"] ?? "")}
                  subtitle={String(item["city"] ?? "")}
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
