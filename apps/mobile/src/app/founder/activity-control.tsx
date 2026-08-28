import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { Activity, Shield, ChevronLeft, X, Filter } from "lucide-react-native";
import { SearchBar } from "@/components/ui";
import {
  AdminPageShell,
  AdminStatCard,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

interface ActivityLogItem {
  id: string;
  admin_user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export default function FounderActivityControlScreen() {
  const { colors, tokens } = useAppTheme();
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadLogs = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("admin_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (entityFilter !== "all") {
          query = query.eq("entity_type", entityFilter);
        }

        const { data, error: err } = await query;
        if (err) {
          // If admin_audit_logs fails due to RLS or missing table, fallback gracefully
          console.warn("admin_audit_logs fetch warning:", err.message);
          setLogs([]);
        } else {
          setLogs((data ?? []) as ActivityLogItem[]);
        }
      } catch (err) {
        console.error("Activity load exception:", err);
        setError("تعذّر تحميل سجل النشاطات");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entityFilter]
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const action = l.action?.toLowerCase() ?? "";
    const entity = l.entity_type?.toLowerCase() ?? "";
    const detailsStr = JSON.stringify(l.details ?? {}).toLowerCase();
    return action.includes(q) || entity.includes(q) || detailsStr.includes(q);
  });

  if (loading && !refreshing) {
    return (
      <AdminPageShell showLogout title="سجل نشاط المنصة" showBack>
        <AdminLoadingState message="جاري تحميل سجل النشاطات..." />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="سجل نشاط المنصة" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Search & Filter bar */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث في سجل النشاطات..."
            onSubmitEditing={() => loadLogs()}
            onClear={() => setSearch("")}
            onFilterPress={() => setShowFilters(true)}
            style={{ flex: 1 }}
          />
        </View>

        {/* Stats Summary */}
        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي السجلات المعروضة" value={filteredLogs.length} accent={colors.primary} />
        </View>

        {/* Logs List */}
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadLogs(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد نشاطات مسجلة حالياً" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSelectedLog(item);
                setShowDetail(true);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.borderSubtle,
                    borderRadius: tokens.radius.md,
                    padding: tokens.spacing.md,
                    marginBottom: tokens.spacing.sm,
                  },
                ]}
              >
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: "700",
                      textAlign: "right",
                      fontFamily: tokens.typography.families.arabic,
                    }}
                  >
                    {item.action}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                      {item.entity_type}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: tokens.typography.sizes.xs,
                    textAlign: "right",
                    fontFamily: tokens.typography.families.arabic,
                    marginTop: 4,
                  }}
                  numberOfLines={2}
                >
                  {item.details ? JSON.stringify(item.details) : "بدون تفاصيل إضافية"}
                </Text>
                <Text style={{ color: colors.textDisabled, fontSize: 10, textAlign: "left", marginTop: 4 }}>
                  {new Date(item.created_at).toLocaleString("ar-DZ")}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
              تصفية حسب نوع الكيان
            </Text>
            {["all", "store", "order", "driver", "merchant", "user", "system"].map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setEntityFilter(opt);
                  setShowFilters(false);
                }}
                style={[
                  styles.filterOpt,
                  {
                    borderColor: entityFilter === opt ? colors.primary : colors.borderSubtle,
                    backgroundColor: entityFilter === opt ? colors.primary + "18" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: entityFilter === opt ? colors.primary : colors.textPrimary,
                    textAlign: "right",
                    fontWeight: "600",
                    fontFamily: tokens.typography.families.arabic,
                  }}
                >
                  {opt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedLog && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    تفاصيل السجل: {selectedLog.action}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                    نوع الكيان: {selectedLog.entity_type}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                    معرف الكيان (ID): {selectedLog.entity_id || "—"}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                    معرف المشرف: {selectedLog.admin_user_id || "—"}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                    التاريخ: {new Date(selectedLog.created_at).toLocaleString("ar-DZ")}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "700", textAlign: "right", marginTop: 8, marginBottom: 4, fontFamily: tokens.typography.families.arabic }}>
                    التفاصيل (JSON):
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                    {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : "لا توجد تفاصيل"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowDetail(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.primary, borderRadius: tokens.radius.md }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 8 },
  card: { borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  filterOpt: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  detailScroll: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  closeBtn: { padding: 14, marginTop: 16, marginBottom: 30 },
});
