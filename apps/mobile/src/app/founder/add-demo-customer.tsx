import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { adminProvisionAccount } from "@/services/admin.service";
import { getFounderZones, type FounderZone } from "@/services/founder-users.service";

export default function FounderAddDemoCustomerScreen() {
  const { colors, tokens } = useAppTheme();
  const [zones, setZones] = useState<FounderZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState<FounderZone | null>(null);
  const [isGoldMember, setIsGoldMember] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    getFounderZones().then((z) => {
      if (mounted) {
        setZones(z);
        setLoadingZones(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!fullName.trim()) return setError("الاسم الكامل مطلوب");
    if (!selectedZone && !address.trim()) return setError("يرجى اختيار الحي أو إدخال العنوان");

    setSubmitting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: err } = await adminProvisionAccount({
      role: "customer",
      full_name: fullName.trim(),
      phone: `0${Math.floor(500000000 + Math.random() * 499999999)}`,
      address: address.trim() || undefined,
      zone_id: selectedZone?.id,
      is_gold_member: isGoldMember,
      status: "active",
      is_demo: true,
    });
    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    }
  }, [fullName, selectedZone, address, isGoldMember]);

  const selectedZoneLabel = selectedZone
    ? `${selectedZone.name} — ${selectedZone.city}`
    : "اختر الحي / المنطقة";

  return (
    <AdminPageShell title="إضافة زبون تجريبي" showBack showLogout>
      <ScrollView
        contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>معلومات الزبون</Text>

          <FieldLabel label="الاسم الكامل" required />
          <FormInput value={fullName} onChange={setFullName} placeholder="الاسم الكامل" />

          <FieldLabel label="الحي / المنطقة" required />
          <TouchableOpacity
            onPress={() => setShowZonePicker(true)}
            style={[styles.pickerBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
          >
            <Text style={{ color: selectedZone ? colors.textPrimary : colors.textDisabled, textAlign: "right", flex: 1, fontSize: tokens.typography.sizes.base }}>
              {selectedZoneLabel}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <FieldLabel label="العنوان التفصيلي (اختياري)" />
          <FormInput value={address} onChange={setAddress} placeholder="العنوان إن وُجد" />

          <View style={[styles.switchRow, { borderColor: colors.borderSubtle }]}>
            <Switch
              value={isGoldMember}
              onValueChange={setIsGoldMember}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={isGoldMember ? "#fff" : colors.textDisabled}
            />
            <Text style={{ color: colors.textPrimary, textAlign: "right", flex: 1, fontSize: tokens.typography.sizes.base }}>
              عضو ذهبي
            </Text>
          </View>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={{ color: colors.error, textAlign: "right", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.errorBox, { backgroundColor: colors.success + "18", borderColor: colors.success }]}>
            <Text style={{ color: colors.success, textAlign: "right", fontSize: 14 }}>
              تم إنشاء الزبون التجريبي بنجاح ✓
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || success}
          style={[styles.submitBtn, { backgroundColor: submitting || success ? colors.primary + "88" : colors.primary, borderRadius: tokens.radius.md, padding: tokens.spacing.lg }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: tokens.typography.sizes.base, fontWeight: "700", textAlign: "center" }}>
              إنشاء زبون تجريبي
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Zone picker */}
      <Modal visible={showZonePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 }}>
              اختر الحي / المنطقة
            </Text>
            {loadingZones ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView>
                <TouchableOpacity
                  onPress={() => { setSelectedZone(null); setShowZonePicker(false); }}
                  style={[styles.zoneItem, { borderColor: colors.borderSubtle }]}
                >
                  <Text style={{ color: colors.textSecondary, textAlign: "right" }}>بدون منطقة</Text>
                </TouchableOpacity>
                {zones.map((z) => (
                  <TouchableOpacity
                    key={z.id}
                    onPress={() => { setSelectedZone(z); setShowZonePicker(false); }}
                    style={[styles.zoneItem, { borderColor: selectedZone?.id === z.id ? colors.primary : colors.borderSubtle }]}
                  >
                    <Text style={{ color: colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{z.name}</Text>
                    <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>{z.city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity onPress={() => setShowZonePicker(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { colors, tokens } = useAppTheme();
  return (
    <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 4 }}>
      {label}{required && <Text style={{ color: colors.error }}> *</Text>}
    </Text>
  );
}

function FormInput({
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: "default" | "email-address" | "phone-pad";
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      secureTextEntry={false}
      keyboardType={keyboard ?? "default"}
      textAlign="right"
      style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, borderRadius: tokens.radius.sm, padding: tokens.spacing.md, fontSize: tokens.typography.sizes.base }]}
    />
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "600", textAlign: "right", textTransform: "uppercase", marginBottom: 4 },
  input: { borderWidth: 1 },
  pickerBtn: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 12 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  submitBtn: { alignItems: "center", marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "70%" },
  zoneItem: { borderBottomWidth: 1, paddingVertical: 12, gap: 2 },
});
