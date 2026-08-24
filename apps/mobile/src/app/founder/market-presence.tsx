import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Activity, Users } from "lucide-react-native";
import { AdminPageShell, AdminEmptyState, AdminStatCard } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useMarketPresenceRoster } from "@/hooks/useMarketPresence";
import type { MarketPresencePayload, MarketPresenceRole } from "@/services/market-presence.service";

const FILTERS: Array<{ key: "all" | MarketPresenceRole; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "customer", label: "الزبائن" },
  { key: "merchant", label: "التجار" },
  { key: "driver", label: "الموصلون" },
];

const roleLabels: Record<MarketPresenceRole, string> = {
  customer: "زبون",
  merchant: "تاجر",
  driver: "موصل",
};

const activityLabels: Record<MarketPresencePayload["activity"], string> = {
  market: "السوق",
  store: "متجر",
  product: "منتج",
  courier: "موصل",
};

function elapsedLabel(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return "نشاط غير متاح";
  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) return "نشط الآن";
  return `منذ ${seconds} ثانية`;
}

function durationLabel(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return "المدة غير متاحة";
  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 60) return `${seconds} ثانية تقريباً`;
  return `${Math.floor(seconds / 60)} دقيقة تقريباً`;
}

export default function FounderMarketPresenceScreen() {
  const { colors, tokens } = useAppTheme();
  const [entries, setEntries] = useState<MarketPresencePayload[]>([]);
  const [filter, setFilter] = useState<"all" | MarketPresenceRole>("all");
  const handlePresenceChange = useCallback((nextEntries: MarketPresencePayload[]) => {
    setEntries(nextEntries);
  }, []);
  useMarketPresenceRoster(handlePresenceChange);

  const filteredEntries = useMemo(
    () => (filter === "all" ? entries : entries.filter((entry) => entry.role === filter)),
    [entries, filter],
  );

  return (
    <AdminPageShell showLogout showBack title="من في السوق الآن" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.intro, { borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated, margin: tokens.spacing.lg }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.success + "18" }]}>
            <Activity size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>الحضور الحي في تجربة السوق</Text>
            <Text style={[styles.description, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>تتجدد القائمة تلقائياً، وتُزال الحالات غير النشطة بعد 60 ثانية.</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: tokens.spacing.lg }}>
          <AdminStatCard label="المستخدمون النشطون الآن" value={filteredEntries.length} accent={colors.success} />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.8}
                style={[styles.filter, { backgroundColor: active ? colors.primary + "18" : colors.bgElevated, borderColor: active ? colors.primary : colors.borderSubtle }]}
              >
                <Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredEntries}
          keyExtractor={(_, index) => `market-presence-${index}`}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingBottom: tokens.spacing["3xl"] }}
          ListEmptyComponent={<AdminEmptyState message="لا يوجد مستخدمون نشطون في السوق حالياً" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md }]}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}><Users size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>{roleLabels[item.role]}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>{activityLabels[item.activity]}</Text>
                </View>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>{elapsedLabel(item.last_activity_at)}</Text>
                <Text style={[styles.meta, { color: colors.textDisabled, fontFamily: tokens.typography.families.arabic }]}>{durationLabel(item.activity_started_at)}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "right", fontSize: 16, fontWeight: "700" },
  description: { textAlign: "right", fontSize: 12, lineHeight: 19, marginTop: 4 },
  filters: { flexDirection: "row-reverse", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  filter: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: "700" },
  card: { borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardTitle: { textAlign: "right", fontSize: 15, fontWeight: "700" },
  cardSubtitle: { textAlign: "right", fontSize: 12, marginTop: 3 },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  metaRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 12 },
  meta: { fontSize: 11, textAlign: "right" },
});
