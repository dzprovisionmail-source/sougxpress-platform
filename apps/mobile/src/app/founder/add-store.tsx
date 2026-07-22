import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Store, ChevronDown } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { createAdminStore, getAdminMerchantsForPicker } from "@/services/admin.service";

const CATEGORIES = [
  { value: "grocery", label: "بقالة" },
  { value: "restaurant", label: "مطعم" },
  { value: "pharmacy", label: "صيدلية" },
  { value: "bakery", label: "مخبز" },
  { value: "butcher", label: "جزارة" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "household", label: "منزلية" },
  { value: "other", label: "أخرى" },
];

export default function FounderAddStoreScreen() {
  const { colors, tokens } = useAppTheme();
  const [merchants, setMerchants] = useState<Array<{ id: string; business_name: string }>>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("grocery");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("عين صفراء");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("22:00");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMerchantPicker, setShowMerchantPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAdminMerchantsForPicker().then((res) => {
      if (mounted) {
        setMerchants(res.data ?? []);
        setLoadingMerchants(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) return setError("اسم المتجر مطلوب");
    if (!selectedMerchantId) return setError("يرجى اختيار التاجر");
    if (!city.trim()) return setError("المدينة مطلوبة");
    if (!address.trim()) return setError("العنوان مطلوب");

    setSubmitting(true);
    const { data, error: err } = await createAdminStore({
      name: name.trim(),
      category,
      merchant_id: selectedMerchantId,
      address_line1: address.trim() || undefined,
      city: city.trim() || undefined,
      country: "الجزائر",
      phone_number: phone.trim() || undefined,
      description: description.trim() || undefined,
      opening_hours: `{"${opensAt}":"${closesAt}"}`,
      status: "active",
    });
    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    }
  }, [name, category, selectedMerchantId, city, address, phone, description, opensAt, closesAt]);

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  return (
    <AdminPageShell title="إضافة متجر" showBack showLogout>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", textTransform: "uppercase", marginBottom: 4 }}>التاجر المرتبط</Text>
        <TouchableOpacity
          onPress={() => setShowMerchantPicker(true)}
          style={[styles.pickerBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
        >
          <Text style={{ color: selectedMerchant ? colors.textPrimary : colors.textDisabled, textAlign: "right", flex: 1, fontSize: tokens.typography.sizes.base }}>
            {selectedMerchant ? selectedMerchant.business_name : "اختر التاجر"}
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", textTransform: "uppercase", marginBottom: 4 }}>المعلومات الأساسية</Text>
        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>اسم المتجر *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="اسم المتجر" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>التصنيف</Text>
          <TouchableOpacity onPress={() => setShowCategoryPicker(true)} style={[styles.pickerBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Text style={{ color: colors.textPrimary, textAlign: "right", flex: 1, fontSize: tokens.typography.sizes.base }}>
              {CATEGORIES.find((c) => c.value === category)?.label ?? category}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>المدينة *</Text>
          <TextInput value={city} onChangeText={setCity} placeholder="المدينة" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>العنوان *</Text>
          <TextInput value={address} onChangeText={setAddress} placeholder="العنوان التفصيلي" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>رقم الهاتف</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="+213..." placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} keyboardType="phone-pad" />
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>ساعات العمل (يفتح - يغلق)</Text>
          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            <TextInput value={opensAt} onChangeText={setOpensAt} placeholder="08:00" placeholderTextColor={colors.textDisabled} textAlign="center" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, flex: 1 }]} />
            <Text style={{ color: colors.textSecondary, alignSelf: "center" }}>-</Text>
            <TextInput value={closesAt} onChangeText={setClosesAt} placeholder="22:00" placeholderTextColor={colors.textDisabled} textAlign="center" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, flex: 1 }]} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 4 }}>الوصف</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="وصف مختصر" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, minHeight: 80 }]} multiline />
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={{ color: colors.error, textAlign: "right", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.errorBox, { backgroundColor: colors.success + "18", borderColor: colors.success }]}>
            <Text style={{ color: colors.success, textAlign: "right", fontSize: 14 }}>تم إنشاء المتجر بنجاح ✓</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || success}
          style={[styles.submitBtn, { backgroundColor: submitting || success ? colors.primary + "88" : colors.primary }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: tokens.typography.sizes.base, fontWeight: "700", textAlign: "center" }}>إنشاء المتجر</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category picker modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 }}>اختر التصنيف</Text>
            <ScrollView>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => { setCategory(c.value); setShowCategoryPicker(false); }}
                  style={[styles.zoneItem, { borderColor: category === c.value ? colors.primary : colors.borderSubtle, backgroundColor: category === c.value ? colors.primary + "18" : "transparent" }]}
                >
                  <Text style={{ color: category === c.value ? colors.primary : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Merchant picker modal */}
      <Modal visible={showMerchantPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 }}>اختر التاجر</Text>
            {loadingMerchants ? (
              <ActivityIndicator color={colors.primary} />
            ) : merchants.length === 0 ? (
              <Text style={{ color: colors.textDisabled, textAlign: "center", paddingVertical: 12 }}>لا يوجد تجار</Text>
            ) : (
              <ScrollView>
                {merchants.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { setSelectedMerchantId(m.id); setShowMerchantPicker(false); }}
                    style={[styles.zoneItem, { borderColor: selectedMerchantId === m.id ? colors.primary : colors.borderSubtle, backgroundColor: selectedMerchantId === m.id ? colors.primary + "18" : "transparent" }]}
                  >
                    <Text style={{ color: selectedMerchantId === m.id ? colors.primary : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{m.business_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity onPress={() => setShowMerchantPicker(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  pickerBtn: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  submitBtn: { borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "70%" },
  zoneItem: { borderBottomWidth: 1, paddingVertical: 12, gap: 2 },
});
