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
import { Store, ShoppingBag, ChevronLeft, X } from "lucide-react-native";
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
  getFounderMerchants,
  getFounderMerchant,
  type FounderMerchant,
} from "@/services/founder-users.service";

export default function FounderMerchantsControlScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedMerchant, setSelectedMerchant] = useState<{
    merchant: FounderMerchant;
    stores: Record<string, unknown>[];
    ordersCount: number;
  } | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadMerchants = useCallback(async (q?: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getFounderMerchants(q);
      setItems(data);
    } catch {
      setError("تعذّر تحميل بيانات التجار");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMerchants(search);
  }, [loadMerchants, search]);

  const openDetail = async (m: FounderMerchant) => {
    const res = await getFounderMerchant(m.id);
    if (!res.merchant) return;
    setSelectedMerchant({
      merchant: res.merchant,
      stores: res.stores,
      ordersCount: res.ordersCount,
    });
    setShowDetail(true);
  };

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="مراقبة التجار" showBack>
        <AdminLoadingState message="جاري تحميل بيانات التجار والمتاجر..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="مراقبة التجار" showBack>
        <AdminErrorState message={error} onRetry={() => loadMerchants(search)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مراقبة التجار" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث باسم المتجر أو التاجر..."
            onSubmitEditing={() => loadMerchants(search)}
            onClear={() => loadMerchants("")}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي التجار" value={items.length} accent={colors.primary} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadMerchants(search, true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد حسابات تجار مسجلة" />}
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
                    {item.business_name || "متجر بدون اسم"}
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
                    المالك: {item.owner_full_name || "—"} · نسبة العمولة: {item.commission_rate != null ? `${item.commission_rate}%` : "غير متوفر"}
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

      {/* Merchant Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedMerchant && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    {selectedMerchant.merchant.business_name || "تفاصيل المتجر والتاجر"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>اسم المالك</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedMerchant.merchant.owner_full_name || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>رقم الهاتف</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedMerchant.merchant.phone || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>البريد الإلكتروني</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }} numberOfLines={1}>{selectedMerchant.merchant.email || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>طلبات المرتبطة</Text>
                    <Text style={{ color: colors.primary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "700" }}>{selectedMerchant.ordersCount}</Text>
                  </View>
                </View>

                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                  المتاجر التابعة ({selectedMerchant.stores.length})
                </Text>
                {selectedMerchant.stores.map((s: any) => (
                  <View key={s.id} style={[styles.addressItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", fontWeight: "600", fontFamily: tokens.typography.families.arabic }}>
                      {s.name} ({s.status})
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", fontFamily: tokens.typography.families.arabic, marginTop: 2 }}>
                      التصنيف: {s.category || "عام"}
                    </Text>
                  </View>
                ))}

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
  addressItem: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  closeBtn: { padding: 14, marginTop: 16, marginBottom: 30 },
});
