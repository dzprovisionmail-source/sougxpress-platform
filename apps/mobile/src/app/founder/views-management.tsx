import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Eye, Plus, Settings, Check, X, Shield, ArrowRight, Store, Truck } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminErrorState } from "@/components/admin";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  getAllPromotionalViews,
  updatePromotionalViews,
  calculateViews,
  type PromotionalViewRecord,
} from "@/services/promotional-views.service";
import { getStoreOrderMetrics, setStoreOrderCountOverride } from "@/services/store-metrics.service";

export default function FounderViewsManagementScreen() {
  const { colors, tokens } = useAppTheme();
  const [records, setRecords] = useState<PromotionalViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for editing views
  const [selectedRecord, setSelectedRecord] = useState<PromotionalViewRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addedViewsInput, setAddedViewsInput] = useState("");
  const [dailyIncrementInput, setDailyIncrementInput] = useState("");
  const [enabledInput, setEnabledInput] = useState(true);
  const [orderCountOverrideInput, setOrderCountOverrideInput] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getAllPromotionalViews();
      setRecords(data);
    } catch (err) {
      console.error("Error loading promotional views management:", err);
      setError("تعذّر تحميل سجلات المشاهدات الترويجية");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = async (record: PromotionalViewRecord) => {
    setSelectedRecord(record);
    setAddedViewsInput("");
    setDailyIncrementInput(String(record.daily_increment));
    setEnabledInput(record.enabled);
    setOrderCountOverrideInput("");
    if (record.entity_type === "store") {
      const metrics = await getStoreOrderMetrics(record.entity_id);
      setOrderCountOverrideInput(
        metrics.orderCountOverride === null ? "" : String(metrics.orderCountOverride),
      );
    }
    setModalVisible(true);
  };

  const handleSaveUpdate = async () => {
    if (!selectedRecord) return;
    const added = parseInt(addedViewsInput, 10) || 0;
    const newInc = parseInt(dailyIncrementInput, 10);

    setUpdating(true);
    try {
      const success = await updatePromotionalViews({
        recordId: selectedRecord.id,
        entityType: selectedRecord.entity_type,
        entityId: selectedRecord.entity_id,
        currentManualViews: selectedRecord.manual_views,
        addedViews: added,
        newDailyIncrement: !isNaN(newInc) ? newInc : undefined,
        newEnabled: enabledInput,
        previousDailyIncrement: selectedRecord.daily_increment,
        previousEnabled: selectedRecord.enabled,
      });

      if (success) {
        if (selectedRecord.entity_type === "store") {
          const trimmedOverride = orderCountOverrideInput.trim();
          const parsedOverride = trimmedOverride === "" ? null : Number(trimmedOverride);
          const overrideResult = await setStoreOrderCountOverride(
            selectedRecord.entity_id,
            parsedOverride,
          );
          if (overrideResult.error) {
            alert(`تم تحديث المشاهدات، لكن تعذر حفظ عداد الطلبات: ${overrideResult.error}`);
            return;
          }
        }
        setModalVisible(false);
        loadData(true);
      } else {
        alert("فشل تحديث المشاهدات");
      }
    } catch (err) {
      console.error("Error in handleSaveUpdate:", err);
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setUpdating(false);
    }
  };

  const filteredRecords = records.filter((r) =>
    r.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const primary = colors.primary;
  const success = colors.success;
  const warning = colors.warning;

  if (loading && records.length === 0) {
    return (
      <AdminPageShell showLogout title="إدارة المشاهدات" showProfile={false} showNotification={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: tokens.spacing.xl }}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={{ color: colors.textSecondary, marginTop: tokens.spacing.md, fontFamily: tokens.typography.families.arabic }}>
            جاري تحميل سجلات المشاهدات الترويجية...
          </Text>
        </View>
      </AdminPageShell>
    );
  }

  if (error && records.length === 0) {
    return (
      <AdminPageShell showLogout title="إدارة المشاهدات" showProfile={false} showNotification={false}>
        <AdminErrorState message={error} onRetry={() => loadData()} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="إدارة المشاهدات الترويجية" showProfile={false} showNotification={false} scrollable={false}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: tokens.spacing.lg, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header summary */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              marginHorizontal: tokens.spacing.lg,
              marginBottom: tokens.spacing.md,
              borderWidth: 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
            <View style={[styles.headerIcon, { backgroundColor: primary + "18", borderColor: primary + "44" }]}>
              <Eye size={22} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.lg, fontWeight: "800", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                تحكم المشاهدات الترويجية (Promotional Views)
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.xs, textAlign: "right", marginTop: 4, fontFamily: tokens.typography.families.arabic, lineHeight: 18 }}>
                إدارة عدادات المتاجر والموصلين (القاعدة: 74 مشاهدة بعد أول 24 ساعة، ثم +30 يومياً، بالإضافة للإضافات اليدوية).
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: tokens.spacing.lg, marginBottom: tokens.spacing.md }}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="بحث بمعرف الكيان (Entity ID) أو النوع..."
            onClear={() => setSearchQuery("")}
          />
        </View>

        {/* Records List */}
        <View style={{ paddingHorizontal: tokens.spacing.lg }}>
          <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "700", textAlign: "right", marginBottom: tokens.spacing.sm, fontFamily: tokens.typography.families.arabic }}>
            الكيانات المسجلة ({filteredRecords.length})
          </Text>

          {filteredRecords.length === 0 ? (
            <View style={{ padding: tokens.spacing.xl, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>لا توجد سجلات مشاهدات مطابقة</Text>
            </View>
          ) : (
            filteredRecords.map((item) => {
              const currentViews = calculateViews(item);
              const startDate = new Date(item.started_at);
              const diffHours = (Date.now() - startDate.getTime()) / (1000 * 60 * 60);
              const completedDays = diffHours >= 24 ? Math.floor((diffHours - 24) / 24) : 0;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.recordCard,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.borderSubtle,
                      borderRadius: tokens.radius.md,
                      padding: tokens.spacing.md,
                      marginBottom: tokens.spacing.sm,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                      <View style={[styles.typeIcon, { backgroundColor: item.entity_type === "store" ? primary + "18" : success + "18" }]}>
                        {item.entity_type === "store" ? <Store size={16} color={primary} /> : <Truck size={16} color={success} />}
                      </View>
                      <View>
                        <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.sm, fontWeight: "700", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                          {item.entity_type === "store" ? "متجر (Store)" : "موصل (Courier)"}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: "right", fontFamily: tokens.typography.families.arabic }} numberOfLines={1}>
                          ID: {item.entity_id}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: item.enabled ? success + "18" : warning + "18", borderColor: item.enabled ? success + "44" : warning + "44" }]}>
                      <Text style={{ color: item.enabled ? success : warning, fontSize: 10, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                        {item.enabled ? "نشط" : "متوقف"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statsGrid, { borderTopColor: colors.borderSubtle }]}>
                    <View style={styles.statCol}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>المشاهدات الحالية</Text>
                      <Text style={{ color: primary, fontSize: 16, fontWeight: "800", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                        {currentViews !== null ? `${currentViews} 👁` : "قيد الانتظار (<24س)"}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>الأيام المكتملة</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                        {completedDays} يوم
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>الزيادة اليومية</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                        +{item.daily_increment}/يوم
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle + "66" }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: tokens.typography.families.arabic }}>
                      إضافات يدوية: +{item.manual_views} | البدء: {new Date(item.started_at).toLocaleDateString("ar-DZ")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOpenModal(item)}
                      style={[styles.editBtn, { backgroundColor: primary + "18", borderColor: primary + "44", borderRadius: tokens.radius.sm }]}
                    >
                      <Text style={{ color: primary, fontSize: 11, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>تعديل / تحكم</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.bgSurface }]}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                تعديل مشاهدات الكيان
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 12, fontFamily: tokens.typography.families.arabic }}>
                  نوع الكيان: {selectedRecord.entity_type} | ID: {selectedRecord.entity_id}
                </Text>

                {selectedRecord.entity_type === "store" ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 6, fontFamily: tokens.typography.families.arabic }}>
                      Override عدد الطلبات الظاهر (اتركه فارغاً لاستخدام العدد الفعلي)
                    </Text>
                    <TextInput
                      value={orderCountOverrideInput}
                      onChangeText={setOrderCountOverrideInput}
                      placeholder="العدد الفعلي"
                      keyboardType="number-pad"
                      style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, borderRadius: tokens.radius.md, textAlign: "right", fontFamily: tokens.typography.families.arabic, paddingHorizontal: 12, height: 44 }]}
                    />
                  </View>
                ) : null}

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 6, fontFamily: tokens.typography.families.arabic }}>
                    إضافة مشاهدات يدوية (مثال: +50 أو -20)
                  </Text>
                  <TextInput
                    value={addedViewsInput}
                    onChangeText={setAddedViewsInput}
                    placeholder="0"
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.borderSubtle,
                        color: colors.textPrimary,
                        borderRadius: tokens.radius.md,
                        textAlign: "right",
                        fontFamily: tokens.typography.families.arabic,
                        paddingHorizontal: 12,
                        height: 44,
                      },
                    ]}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 6, fontFamily: tokens.typography.families.arabic }}>
                    الزيادة اليومية (Daily Increment)
                  </Text>
                  <TextInput
                    value={dailyIncrementInput}
                    onChangeText={setDailyIncrementInput}
                    placeholder="30"
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.borderSubtle,
                        color: colors.textPrimary,
                        borderRadius: tokens.radius.md,
                        textAlign: "right",
                        fontFamily: tokens.typography.families.arabic,
                        paddingHorizontal: 12,
                        height: 44,
                      },
                    ]}
                  />
                </View>

                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingVertical: 8 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", fontFamily: tokens.typography.families.arabic }}>
                    حالة العداد الترويجي (تفعيل/إيقاف الزيادة)
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEnabledInput(!enabledInput)}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: enabledInput ? success + "18" : warning + "18",
                        borderColor: enabledInput ? success : warning,
                        borderRadius: tokens.radius.sm,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={{ color: enabledInput ? success : warning, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                      {enabledInput ? "نشط (يعمل)" : "متوقف"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSaveUpdate}
                  disabled={updating}
                  style={[styles.saveBtn, { backgroundColor: primary, borderRadius: tokens.radius.md, height: 48, justifyContent: "center", alignItems: "center" }]}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700", fontFamily: tokens.typography.families.arabic, fontSize: 14 }}>
                      حفظ التعديلات وسجل التدقيق
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  headerCard: { borderWidth: 1 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  recordCard: { borderWidth: 1 },
  typeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statsGrid: { flexDirection: "row-reverse", marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: "center" },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainer: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingBottom: 40, borderWidth: 1 },
  input: { borderWidth: 1 },
  toggleBtn: {},
  saveBtn: { marginTop: 10 },
});
