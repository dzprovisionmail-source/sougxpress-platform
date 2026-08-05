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
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, Filter, X, Edit3, Trash2, Check, XCircle, Pin, Eye, EyeOff, Star, Truck } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  AdminPageShell,
  AdminListItem,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import {
  getFounderCouriers,
  createFounderCourier,
  updateFounderCourier,
  deleteFounderCourier,
  toggleFounderCourierAvailability,
  toggleFounderCourierVerified,
  toggleFounderCourierDemo,
  toggleFounderCourierPinned,
  toggleFounderCourierHomeVisibility,
  reorderFounderCourier,
  type FounderCourier,
  type FounderCourierListParams,
} from "@/services/founder-courier.service";
import { vehicleLabel } from "@/utils/courier.utils";
import { TOKENS } from "@/constants/tokens";
import { useRealtimeCourierList } from "@/hooks/useRealtimeCourierList";

type StatusFilter = FounderCourierListParams["status_filter"];

const STATUS_OPTS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "available", label: "متاح" },
  { value: "unavailable", label: "غير متاح" },
  { value: "demo", label: "تجريبي" },
  { value: "verified", label: "موثق" },
  { value: "pinned", label: "مثبت" },
  { value: "hidden", label: "مخفي من الصفحة" },
];

export default function FounderCouriersScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<FounderCourier | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(
    async (q?: string, refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await getFounderCouriers({
          search: q || search || undefined,
          status_filter: statusFilter,
          include_inactive: true,
          limit: 200,
        });
        setItems(data ?? []);
        setError(err);
      } catch {
        setError("تعذّر تحميل بيانات الموصلين");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => { load(search, false); }, [load, search, statusFilter]);

  useRealtimeCourierList(() => {
    load(search, true);
  });

  const handleToggle = async (
    id: string,
    action: () => Promise<{ error: string | null }>
  ) => {
    setActionLoading(true);
    const { error: err } = await action();
    setActionLoading(false);
    if (err) {
      Alert.alert("خطأ", err);
    } else {
      setSelected((prev) => (prev && prev.id === id ? { ...prev, ...(action === toggleFounderCourierAvailability ? { is_available: !prev.is_available } : {}) } : prev));
      load(search, true);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("حذف الموصل", "هل أنت متأكد من حذف هذا الموصل؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          const { error: err } = await deleteFounderCourier(id);
          setActionLoading(false);
          if (err) Alert.alert("خطأ", err);
          else {
            setSelected(null);
            load(search, true);
          }
        },
      },
    ]);
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("خطأ", "لا يمكن فتح تطبيق الاتصال"));
  };

  if (loading) {
    return (
      <AdminPageShell title="إدارة الموصلين" showBack showLogout>
        <AdminLoadingState message="جاري تحميل الموصلين..." />
      </AdminPageShell>
    );
  }

  if (error && items.length === 0) {
    return (
      <AdminPageShell title="إدارة الموصلين" showBack showLogout>
        <AdminErrorState message={error} onRetry={() => load(search)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="إدارة الموصلين" showBack showLogout scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.searchRow, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="بحث بالاسم أو الهاتف..."
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
            onPress={() => setShowFilters((v) => !v)}
            style={[styles.filterBtn, {
              backgroundColor: showFilters ? colors.primary + "22" : colors.bgElevated,
              borderColor: showFilters ? colors.primary : colors.borderSubtle,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
            }]}
          >
            <Filter color={showFilters ? colors.primary : colors.textSecondary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/founder/courier-form" as never)}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.sm }}>
            {STATUS_OPTS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => { setStatusFilter(f.value); setShowFilters(false); }}
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

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(search, true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<AdminEmptyState message="لا يوجد موصلون" />}
          renderItem={({ item }) => (
            <AdminListItem
              title={item.full_name}
              subtitle={`${item.phone_number} · ${vehicleLabel(item.vehicle_type)}${item.is_mock ? " 🔬 تجريبي" : ""}`}
              badge={
                item.is_verified
                  ? "موثق"
                  : item.is_pinned
                  ? "مثبت"
                  : item.is_available
                  ? "متاح"
                  : "غير متاح"
              }
              badgeColor={
                item.is_verified
                  ? colors.success
                  : item.is_pinned
                  ? colors.primary
                  : item.is_available
                  ? colors.success
                  : colors.textDisabled
              }
              onPress={() => setSelected(item)}
              right={
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {!item.show_on_home && <EyeOff size={16} color={colors.textDisabled} />}
                  {item.is_pinned && <Pin size={16} color={colors.primary} />}
                </View>
              }
            />
          )}
        />
      </View>

      {/* ─── Detail / Actions Modal ────────────────────────────────────────── */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.sheetHeader}>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.md, fontWeight: "700", flex: 1, textAlign: "right" }}>
                {selected?.full_name}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            {selected && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
                  <Badge label={selected.is_available ? "متاح" : "غير متاح"} color={selected.is_available ? colors.success : colors.textDisabled} />
                  {selected.is_mock && <Badge label="تجريبي" color={colors.warning} />}
                  {selected.is_verified && <Badge label="موثق" color={colors.success} />}
                  {selected.is_pinned && <Badge label="مثبت" color={colors.primary} />}
                  <Badge label={selected.show_on_home ? "على الصفحة" : "مخفي"} color={selected.show_on_home ? colors.success : colors.textDisabled} />
                </View>

                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right" }}>
                  الهاتف: {selected.phone_number}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right" }}>
                  المركبة: {vehicleLabel(selected.vehicle_type)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right" }}>
                  الترتيب: {selected.display_order}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right" }}>
                  التقييم: {selected.rating}
                </Text>

                <View style={{ gap: 8, marginTop: 8 }}>
<ActionRow
                     label={selected.is_available ? "تعطيل" : "تفعيل"}
                     color={selected.is_available ? colors.warning : colors.success}
                     onPress={() => handleToggle(selected.id, () => toggleFounderCourierAvailability(selected.id))}
                     tokens={tokens}
                     icon={selected.is_available ? <XCircle size={16} color={selected.is_available ? colors.warning : colors.success} /> : <Check size={16} color={selected.is_available ? colors.warning : colors.success} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label={selected.is_verified ? "إزالة التوثيق" : "توثيق"}
                     color={colors.success}
                     onPress={() => handleToggle(selected.id, () => toggleFounderCourierVerified(selected.id))}
                     tokens={tokens}
                     icon={<Star size={16} color={colors.success} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label={selected.is_mock ? "إزالة وضع التجربة" : "وضع تجربة"}
                     color={colors.warning}
                     onPress={() => handleToggle(selected.id, () => toggleFounderCourierDemo(selected.id))}
                     tokens={tokens}
                     icon={<Truck size={16} color={colors.warning} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label={selected.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                     color={colors.primary}
                     onPress={() => handleToggle(selected.id, () => toggleFounderCourierPinned(selected.id))}
                     tokens={tokens}
                     icon={<Pin size={16} color={colors.primary} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label={selected.show_on_home ? "إخفاء من الصفحة" : "إظهار على الصفحة"}
                     color={colors.info}
                     onPress={() => handleToggle(selected.id, () => toggleFounderCourierHomeVisibility(selected.id))}
                     tokens={tokens}
                     icon={selected.show_on_home ? <EyeOff size={16} color={colors.info} /> : <Eye size={16} color={colors.info} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label="تعديل"
                     color={colors.secondary}
                     onPress={() => { setSelected(null); router.push(`/founder/courier-form?id=${selected.id}` as never); }}
                     tokens={tokens}
                     icon={<Edit3 size={16} color={colors.secondary} />}
                     actionLoading={actionLoading}
                   />
                   <ActionRow
                     label="حذف"
                     color={colors.error}
                     onPress={() => handleDelete(selected.id)}
                     tokens={tokens}
                     icon={<Trash2 size={16} color={colors.error} />}
                     actionLoading={actionLoading}
                   />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: color + "22" }}>
      <Text style={{ color, fontFamily: TOKENS.typography.families.arabic, fontSize: TOKENS.typography.sizes.xs, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  label,
  color,
  onPress,
  tokens,
  icon,
  actionLoading,
}: {
  label: string;
  color: string;
  onPress: () => void;
  tokens: ReturnType<typeof useAppTheme>["tokens"];
  icon: React.ReactNode;
  actionLoading: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={actionLoading}
      style={{
        backgroundColor: color + "18",
        borderColor: color,
        borderWidth: 1,
        borderRadius: tokens.radius.full,
        paddingVertical: tokens.spacing.md,
        alignItems: "center",
        flexDirection: "row-reverse",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {icon}
      <Text style={{ color, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row-reverse", gap: 10, alignItems: "center" },
  searchInput: { borderWidth: 1, writingDirection: "rtl" },
  filterBtn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 12, gap: 8 },
});
