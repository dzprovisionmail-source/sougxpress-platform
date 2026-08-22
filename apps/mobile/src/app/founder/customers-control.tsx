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
import { Users, Phone, MapPin, ShoppingBag, ChevronLeft, X } from "lucide-react-native";
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
  getFounderCustomers,
  getFounderCustomer,
  type FounderCustomer,
  type CustomerAddress,
} from "@/services/founder-users.service";

export default function FounderCustomersControlScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: FounderCustomer;
    addresses: CustomerAddress[];
    ordersCount: number;
  } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCustomers = useCallback(async (q?: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getFounderCustomers(q);
      setItems(data);
    } catch {
      setError("تعذّر تحميل بيانات الزبائن");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(search);
  }, [loadCustomers, search]);

  const openDetail = async (cust: FounderCustomer) => {
    setDetailLoading(true);
    const res = await getFounderCustomer(cust.id);
    setDetailLoading(false);
    if (!res.customer) return;
    setSelectedCustomer({
      customer: res.customer,
      addresses: res.addresses,
      ordersCount: res.ordersCount,
    });
    setShowDetail(true);
  };

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="مراقبة الزبائن" showBack>
        <AdminLoadingState message="جاري تحميل بيانات الزبائن..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="مراقبة الزبائن" showBack>
        <AdminErrorState message={error} onRetry={() => loadCustomers(search)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مراقبة الزبائن" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث بالاسم أو الهاتف..."
            onSubmitEditing={() => loadCustomers(search)}
            onClear={() => loadCustomers("")}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي الزبائن" value={items.length} accent={colors.primary} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadCustomers(search, true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد حسابات زبائن مسجلة" />}
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
                    {item.full_name || "زبون بدون اسم"}
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
                    {item.phone || item.email || "بدون معلومات اتصال"}
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

      {/* Customer Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedCustomer && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    {selectedCustomer.customer.full_name || "تفاصيل الزبون"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>رقم الهاتف</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedCustomer.customer.phone || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>البريد الإلكتروني</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "500" }} numberOfLines={1}>{selectedCustomer.customer.email || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>عدد الطلبات الكلي</Text>
                    <Text style={{ color: colors.primary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "700" }}>{selectedCustomer.ordersCount}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>العضوية الذهبية</Text>
                    <Text style={{ color: selectedCustomer.customer.is_gold_member ? colors.success : colors.textSecondary, fontSize: 13, textAlign: "right", flex: 2, fontWeight: "600" }}>
                      {selectedCustomer.customer.is_gold_member ? "نعم" : "لا"}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                  العناوين المسجلة ({selectedCustomer.addresses.length})
                </Text>
                {selectedCustomer.addresses.map((addr) => (
                  <View key={addr.id} style={[styles.addressItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", fontWeight: "600", fontFamily: tokens.typography.families.arabic }}>
                      {addr.label || "عنوان"} {addr.is_default ? "(افتراضي)" : ""}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", fontFamily: tokens.typography.families.arabic, marginTop: 2 }}>
                      {addr.address_line1}, {addr.city}
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
