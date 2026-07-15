import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Filter, X } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  AdminPageShell,
  AdminListItem,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import { getAdminMerchants, updateAdminMerchantStatus } from "@/services/admin.service";

type MerchantStatus = "pending_review" | "active" | "suspended" | "rejected";

const STATUS_LABELS: Record<MerchantStatus, string> = {
  pending_review: "قيد المراجعة",
  active: "نشط",
  suspended: "موقوف",
  rejected: "مرفوض",
};

const STATUS_COLORS: Record<MerchantStatus, string> = {
  pending_review: "#FFD600",
  active: "#00C853",
  suspended: "#D50000",
  rejected: "#B0B0B0",
};

const STATUS_FILTERS: Array<{ value: MerchantStatus | "all"; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "pending_review", label: "قيد المراجعة" },
  { value: "active", label: "نشط" },
  { value: "suspended", label: "موقوف" },
  { value: "rejected", label: "مرفوض" },
];

export default function AdminMerchantsScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MerchantStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (q?: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: err } = await getAdminMerchants(q || undefined);
    setItems(data);
    setError(err);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered =
    statusFilter === "all"
      ? items
      : items.filter((i) => i["status"] === statusFilter);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(true);
    setActionError(null);
    const { error: err } = await updateAdminMerchantStatus(id, newStatus);
    setActionLoading(false);
    if (err) {
      setActionError(err);
    } else {
      setSelected(null);
      load(search);
    }
  };

  const currentStatus = (selected?.["status"] as MerchantStatus) ?? "pending_review";

  return (
    <AdminPageShell title="التجار" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث عن تاجر..."
            placeholderTextColor={colors.textDisabled}
            textAlign="right"
            returnKeyType="search"
            style={[styles.searchInput, {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              color: colors.textPrimary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.base,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
              flex: 1,
            }]}
          />
          <TouchableOpacity
            style={[styles.filterBtn, {
              backgroundColor: showFilters ? colors.primary + "22" : colors.bgElevated,
              borderColor: showFilters ? colors.primary : colors.borderSubtle,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
            }]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Filter color={showFilters ? colors.primary : colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.sm }}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setStatusFilter(f.value)}
                style={{
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.xs,
                  borderRadius: tokens.radius.full,
                  borderWidth: 1,
                  borderColor: statusFilter === f.value ? colors.primary : colors.borderSubtle,
                  backgroundColor: statusFilter === f.value ? colors.primary + "22" : colors.bgElevated,
                }}
              >
                <Text style={{ color: statusFilter === f.value ? colors.primary : colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, fontWeight: "600" }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <AdminLoadingState message="جاري تحميل التجار..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => load()} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="لا يوجد تجار مسجّلون حالياً" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item["id"])}
            contentContainerStyle={{ padding: tokens.spacing.lg }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(search, true)}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const status = (item["status"] as MerchantStatus) ?? "pending_review";
              return (
                <AdminListItem
                  title={String(item["business_name"] ?? "")}
                  subtitle={String(item["owner_full_name"] ?? "")}
                  badge={STATUS_LABELS[status] ?? status}
                  badgeColor={STATUS_COLORS[status] ?? colors.textSecondary}
                  onPress={() => { setSelected(item); setActionError(null); }}
                />
              );
            }}
          />
        )}
      </View>

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.sheetHeader}>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.md, fontWeight: "700", flex: 1, textAlign: "right" }}>
                {String(selected?.["business_name"] ?? "")}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 4 }}>
              المالك: {String(selected?.["owner_full_name"] ?? "—")}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 4 }}>
              الهاتف: {String(selected?.["phone"] ?? "—")}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 16 }}>
              الحالة: {STATUS_LABELS[currentStatus] ?? currentStatus}
            </Text>

            {actionError && (
              <Text style={{ color: colors.error, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 8 }}>
                {actionError}
              </Text>
            )}

            {actionLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={{ gap: 10 }}>
                {currentStatus === "pending_review" && (
                  <ActionButton label="قبول وتفعيل" color={colors.success} onPress={() => handleStatusChange(String(selected?.["id"]), "active")} tokens={tokens} />
                )}
                {currentStatus === "pending_review" && (
                  <ActionButton label="رفض" color={colors.error} onPress={() => handleStatusChange(String(selected?.["id"]), "rejected")} tokens={tokens} />
                )}
                {currentStatus === "active" && (
                  <ActionButton label="إيقاف" color={colors.warning} onPress={() => handleStatusChange(String(selected?.["id"]), "suspended")} tokens={tokens} />
                )}
                {currentStatus === "suspended" && (
                  <ActionButton label="إعادة تفعيل" color={colors.success} onPress={() => handleStatusChange(String(selected?.["id"]), "active")} tokens={tokens} />
                )}
                {currentStatus === "rejected" && (
                  <ActionButton label="إعادة النظر (تفعيل)" color={colors.info} onPress={() => handleStatusChange(String(selected?.["id"]), "active")} tokens={tokens} />
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

function ActionButton({
  label,
  color,
  onPress,
  tokens,
}: {
  label: string;
  color: string;
  onPress: () => void;
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: color + "22",
        borderColor: color,
        borderWidth: 1,
        borderRadius: tokens.radius.full,
        paddingVertical: tokens.spacing.md,
        alignItems: "center",
      }}
    >
      <Text style={{ color, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row-reverse", gap: 10 },
  searchInput: { borderWidth: 1, writingDirection: "rtl" },
  filterBtn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHeader: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 12, gap: 8 },
});
