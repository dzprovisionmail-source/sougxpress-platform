import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card, Badge } from "@/components/ui";
import {
  MapPin, Plus, Trash2, Home, Briefcase,
  Map as MapIcon, ChevronRight, ChevronLeft, Check, Pencil, X,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  id: string;
  label: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_text: string | null;
  city: string | null;
  country: string | null;
  is_default: boolean;
  zone_id: string | null;
}

interface AddressFormData {
  label: string;
  address_line1: string;
  city: string;
  country: string;
  zone_id: string;
}

const DEFAULT_FORM: AddressFormData = {
  label: "",
  address_line1: "",
  city: "عين صفراء",
  country: "الجزائر",
  zone_id: "",
};

// ─── Address Form Modal ───────────────────────────────────────────────────────

function AddressFormModal({
  visible,
  initial,
  onSave,
  onClose,
  saving,
  colors,
  isRTL,
}: {
  visible: boolean;
  initial: AddressFormData;
  onSave: (data: AddressFormData) => void;
  onClose: () => void;
  saving: boolean;
  colors: ReturnType<typeof getThemeColors>;
  isRTL: boolean;
}) {
  const [form, setForm] = useState<AddressFormData>(initial);

  // Reset form whenever modal opens with new initial data
  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  const isValid = form.address_line1.trim().length > 0 && form.city.trim().length > 0;

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.bgElevated,
      borderColor: colors.borderSubtle,
      color: colors.textPrimary,
      textAlign: (isRTL ? "right" : "left") as "right" | "left",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="h2" style={{ color: colors.textPrimary }}>
                {initial.address_line1 ? "تعديل العنوان" : "إضافة عنوان"}
              </Typography>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Label */}
              <View style={styles.fieldGroup}>
                <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                  التسمية (اختياري)
                </Typography>
                <TextInput
                  style={inputStyle}
                  value={form.label}
                  onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
                  placeholder="مثال: المنزل، العمل"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              {/* Address line */}
              <View style={styles.fieldGroup}>
                <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                  العنوان التفصيلي *
                </Typography>
                <TextInput
                  style={inputStyle}
                  value={form.address_line1}
                  onChangeText={(v) => setForm((f) => ({ ...f, address_line1: v }))}
                  placeholder="الشارع، الحي، رقم المبنى…"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* City */}
              <View style={styles.fieldGroup}>
                <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                  المدينة *
                </Typography>
                <TextInput
                  style={inputStyle}
                  value={form.city}
                  onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                  placeholder="المدينة"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              {/* Country */}
              <View style={styles.fieldGroup}>
                <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                  الدولة *
                </Typography>
                <TextInput
                  style={inputStyle}
                  value={form.country}
                  onChangeText={(v) => setForm((f) => ({ ...f, country: v }))}
                  placeholder="الدولة"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              {/* Zone */}
              <View style={styles.fieldGroup}>
                <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                  الحي *
                </Typography>
                <TextInput
                  style={inputStyle}
                  value={form.zone_id}
                  onChangeText={(v) => setForm((f) => ({ ...f, zone_id: v }))}
                  placeholder="مثال: Ain Sefra"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            </ScrollView>

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: isValid ? colors.primary : colors.bgElevated },
              ]}
              onPress={() => onSave(form)}
              disabled={!isValid || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Typography
                  variant="body"
                  style={{ color: isValid ? "#fff" : colors.textDisabled, fontWeight: "700" }}
                >
                  حفظ العنوان
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerAddressesScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<AddressFormData>(DEFAULT_FORM);

  useEffect(() => {
    fetchAddresses();
  }, []);

  // ── Data helpers ────────────────────────────────────────────────────────────

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("customer_addresses")
        .select("id, label, address_line1, address_line2, address_text, city, country, is_default, zone_id")
        .eq("customer_id", user.id)
        .order("is_default", { ascending: false });

      if (fetchError) throw fetchError;
      setAddresses((data as Address[]) || []);
    } catch (err) {
      console.error("Error fetching addresses:", err);
      setError("حدث خطأ أثناء تحميل العناوين");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormInitial(DEFAULT_FORM);
    setModalVisible(true);
  };

  const handleOpenEdit = (address: Address) => {
    setEditingId(address.id);
    setFormInitial({
      label: address.label || "",
      address_line1: address.address_line1 || address.address_text || "",
      city: address.city || "عين صفراء",
      country: address.country || "الجزائر",
      zone_id: address.zone_id || "",
    });
    setModalVisible(true);
  };

  const handleSave = async (form: AddressFormData) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const addressLine = form.address_line1.trim();
      const payload = {
        label: form.label.trim() || "عنوان",
        address_line1: addressLine,
        address_text: addressLine,  // keep in sync for older query paths
        city: form.city.trim() || "عين صفراء",
        country: form.country.trim() || "الجزائر",
        zone_id: form.zone_id.trim() || null,
      };

      if (editingId) {
        // Edit existing
        const { error: updateError } = await supabase
          .from("customer_addresses")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        // Add new — determine if this should be the first/default address
        const isFirst = addresses.length === 0;
        const { error: insertError } = await supabase
          .from("customer_addresses")
          .insert({ ...payload, customer_id: user.id, is_default: isFirst });
        if (insertError) throw insertError;
      }

      setModalVisible(false);
      await fetchAddresses();
    } catch (err) {
      console.error("Error saving address:", err);
      Alert.alert("خطأ", "تعذّر حفظ العنوان. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear all defaults first, then set the chosen one
      const { error: clearError } = await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", user.id);
      if (clearError) throw clearError;

      const { error: setError } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (setError) throw setError;

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    } catch (err) {
      console.error("Error setting default address:", err);
      Alert.alert("خطأ", "تعذّر تعيين العنوان الافتراضي");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "حذف العنوان",
      "هل أنت متأكد أنك تريد حذف هذا العنوان؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from("customer_addresses")
                .delete()
                .eq("id", id);
              if (deleteError) throw deleteError;
              fetchAddresses();
            } catch (err) {
              console.error("Error deleting address:", err);
              Alert.alert("خطأ", "تعذر حذف العنوان");
            }
          },
        },
      ]
    );
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getAddressText = (addr: Address) =>
    addr.address_text || addr.address_line1 || "";

  const getAddressIcon = (addr: Address) => {
    const text = ((getAddressText(addr)) || addr.label || "").toLowerCase();
    if (text.includes("منزل") || text.includes("home"))
      return <Home size={20} color={colors.primary} />;
    if (text.includes("عمل") || text.includes("work") || text.includes("office"))
      return <Briefcase size={20} color={colors.primary} />;
    return <MapIcon size={20} color={colors.primary} />;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Bottom padding: safe area inset for gesture nav bar (tab bar handles its own space)
  const footerPb = Math.max(TOKENS.spacing.lg, insets.bottom);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL
            ? <ChevronRight size={24} color={colors.textPrimary} />
            : <ChevronLeft size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>عناويني</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.emptyContainer}>
            <MapPin color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              تعذّر تحميل العناوين
            </Typography>
            <TouchableOpacity onPress={fetchAddresses} style={{ marginTop: 16 }}>
              <Typography variant="caption" color="primary">إعادة المحاولة</Typography>
            </TouchableOpacity>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              لا توجد عناوين محفوظة
            </Typography>
            <Typography variant="body" color="disabled" style={{ marginTop: 8, textAlign: "center" }}>
              أضف عنوانك لتسهيل توصيل طلباتك
            </Typography>
          </View>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} style={styles.addressCard}>
              {/* Top row: icon + info */}
              <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
                  {getAddressIcon(address)}
                </View>

                <View style={[styles.addressInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Typography variant="h3">
                      {address.label || getAddressText(address)}
                    </Typography>
                    {address.is_default && <Badge variant="success" label="افتراضي" />}
                  </View>
                  <Typography variant="body" color="secondary">
                    {getAddressText(address)}
                    {(address.city || address.country)
                      ? ` • ${[address.city, address.country].filter(Boolean).join(", ")}`
                      : ""}
                  </Typography>
                </View>
              </View>

              {/* Action buttons row */}
              <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {/* Set default */}
                {!address.is_default && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Check size={14} color={colors.primary} />
                    <Typography variant="caption" style={{ color: colors.primary, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}>
                      تعيين افتراضي
                    </Typography>
                  </TouchableOpacity>
                )}

                {/* Edit */}
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.borderSubtle }]}
                  onPress={() => handleOpenEdit(address)}
                >
                  <Pencil size={14} color={colors.textSecondary} />
                  <Typography variant="caption" color="secondary" style={{ marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}>
                    تعديل
                  </Typography>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "rgba(255,0,0,0.1)" }]}
                  onPress={() => handleDelete(address.id)}
                >
                  <Trash2 size={14} color={colors.error} />
                  <Typography variant="caption" style={{ color: colors.error, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}>
                    حذف
                  </Typography>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Footer — Add button */}
      <View style={[styles.footer, { paddingBottom: footerPb }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleOpenAdd}
        >
          <Plus size={20} color="#fff" />
          <Typography variant="body" style={{ color: "#fff", fontWeight: "700", marginLeft: 8 }}>
            إضافة عنوان جديد
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Add / Edit modal */}
      <AddressFormModal
        visible={modalVisible}
        initial={formInitial}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        saving={saving}
        colors={colors}
        isRTL={isRTL}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { color: TOKENS.colors.brandPrimary, flex: 1, textAlign: "center" },
  backBtn: { padding: 4 },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
    flexGrow: 1,
  },
  addressCard: { padding: TOKENS.spacing.md },
  addressRow: { alignItems: "center", gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.sm },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  addressInfo: { flex: 1 },
  titleRow: { alignItems: "center", gap: 8, marginBottom: 2 },
  actionsRow: {
    gap: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: TOKENS.spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
  },
  footer: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    padding: TOKENS.spacing.lg,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.07)",
  },
  closeBtn: { padding: 4 },
  modalBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: TOKENS.radius.sm,
    padding: TOKENS.spacing.md,
    fontSize: 15,
    minHeight: 44,
  },
  saveBtn: {
    margin: TOKENS.spacing.lg,
    marginTop: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    alignItems: "center",
  },
});
