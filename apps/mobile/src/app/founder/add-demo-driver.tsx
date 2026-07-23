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
} from "react-native";
import { router } from "expo-router";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { adminProvisionAccount } from "@/services/admin.service";

const VEHICLE_TYPES = ["دراجة نارية", "سيارة", "دراجة هوائية", "شاحنة صغيرة"];

export default function FounderAddDemoDriverScreen() {
  const { colors, tokens } = useAppTheme();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!fullName.trim()) return setError("الاسم الكامل مطلوب");
    if (!phone.trim()) return setError("رقم الهاتف مطلوب");
    if (!vehicleType) return setError("نوع المركبة مطلوب");

    setSubmitting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: err } = await adminProvisionAccount({
      role: "driver",
      full_name: fullName.trim(),
      phone: phone.trim(),
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber.trim() || undefined,
      zone_id: undefined,
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
  }, [fullName, phone, vehicleType, vehicleNumber]);

  return (
    <AdminPageShell title="إضافة موصل تجريبي" showBack showLogout>
      <ScrollView
        contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>معلومات الموصل</Text>

          <FieldLabel label="الاسم الكامل" required />
          <FormInput value={fullName} onChange={setFullName} placeholder="الاسم الكامل" />

          <FieldLabel label="رقم الهاتف" required />
          <FormInput value={phone} onChange={setPhone} placeholder="+213..." keyboard="phone-pad" />

          <FieldLabel label="نوع المركبة" required />
          <View style={styles.vehicleTypes}>
            {VEHICLE_TYPES.map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVehicleType(v)}
                style={[
                  styles.vehicleChip,
                  {
                    backgroundColor: vehicleType === v ? colors.primary + "22" : colors.bgElevated,
                    borderColor: vehicleType === v ? colors.primary : colors.borderSubtle,
                    borderRadius: tokens.radius.sm,
                  },
                ]}
              >
                <Text style={{ color: vehicleType === v ? colors.primary : colors.textSecondary, fontSize: 13, textAlign: "center" }}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FieldLabel label="رقم المركبة (اختياري)" />
          <FormInput value={vehicleNumber} onChange={setVehicleNumber} placeholder="رقم اللوحة" />
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={{ color: colors.error, textAlign: "right", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.errorBox, { backgroundColor: colors.success + "18", borderColor: colors.success }]}>
            <Text style={{ color: colors.success, textAlign: "right", fontSize: 14 }}>
              تم إنشاء الموصل التجريبي بنجاح ✓
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
              إنشاء موصل تجريبي
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  vehicleTypes: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  vehicleChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  submitBtn: { alignItems: "center", marginTop: 8 },
});
