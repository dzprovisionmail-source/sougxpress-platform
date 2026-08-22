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
import { Truck, Phone, ChevronLeft, X } from "lucide-react-native";
import { SearchBar } from "@/components/ui";
import {
  AdminPageShell,
  AdminStatCard,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderDrivers,
  getFounderDriver,
  type FounderDriver,
} from "@/services/founder-users.service";

export default function FounderCouriersControlScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedDriver, setSelectedDriver] = useState<{
    driver: FounderDriver;
    deliveriesCount: number;
    activeCycles: Record<string, unknown>[];
  } | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadDrivers = useCallback(async (q?: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getFounderDrivers(q);
      setItems(data);
    } catch {
      setError("تعذّر تحميل بيانات الموصلين");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers(search);
  }, [loadDrivers, search]);

  const openDetail = async (driver: FounderDriver) => {
    const res = await getFounderDriver(driver.id);
    if (!res.driver) return;
    setSelectedDriver({
      driver: res.driver,
      deliveriesCount: res.deliveriesCount,
      activeCycles: res.activeCycles,
    });
    setShowDetail(true);
  };

  const fmtMinor = (minor: number) => `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="مراقبة الموصلين" showBack>
        <AdminLoadingState message="جاري تحميل بيانات الموصلين والتوصيلات..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="مراقبة الموصلين" showBack>
        <AdminErrorState message={error} onRetry={() => loadDrivers(search)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مراقبة الموصلين" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث باسم الموصل أو الهاتف..."
            onSubmitEditing={() => loadDrivers(search)}
            onClear={() => loadDrivers("")}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي الموصلين" value={items.length} accent={colors.success} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadDrivers(search, true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد حسابات موصلين مسجلة" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.borderSubtle,
                    borderRadius: tokens.radius.md,
                    padding: tokens.spacing.md,
                    marginBottom: tokens.spacing.sm,
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 12,
                  },
                ]}
              >
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: "700",
                      textAlign: "right",
                      fontFamily: tokens.typography.families.arabic,
                    }}
                    numberOfLines={1}
                  >
                    {item.full_name || "موصل بدون اسم"}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: tokens.typography.sizes.xs,
                      textAlign: "right",
                      fontFamily: tokens.typography.families.arabic,
                      marginTop: 2,
                    }}
                  >
                    {item.phone || "—"} · المركبة: {item.vehicle_type || "غير محدد"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: (item.status === "active" ? colors.success : colors.warning) + "18",
                      borderColor: (item.status === "active" ? colors.success : colors.warning) + "44",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: item.status === "active" ? colors.success : colors.warning,
                      fontSize: 11,
                      fontWeight: "700",
                      fontFamily: tokens.typography.families.arabic,
                    }}
                  >
                    {item.status === "active" ? "نشط" : item.status}
                  </Text>
                </View>
                <ChevronLeft size={16} color={colors.textDisabled} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Driver Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedDriver && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    {selectedDriver.driver.full_name || "تفاصيل الموصل"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>رقم الهاتف</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDriver.driver.phone || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>نوع المركبة</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDriver.driver.vehicle_type || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>رقم لوحة المركبة</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedDriver.driver.vehicle_number || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>إجمالي التوصيلات المنجزة</Text>
                    <Text style={{ color: colors.success, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "700" }}>{selectedDriver.deliveriesCount}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>الذمم المالية المستحقة</Text>
                    <Text style={{ color: colors.warning, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "700" }}>
                      {selectedDriver.driver.commission_owed_minor != null ? fmtMinor(selectedDriver.driver.commission_owed_minor) : "غير متوفر"}
                    </Text>
                  </View>
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  detailScroll: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: "row-reverse", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)" },
  closeBtn: { padding: 14, marginTop: 16, marginBottom: 30 },
});
