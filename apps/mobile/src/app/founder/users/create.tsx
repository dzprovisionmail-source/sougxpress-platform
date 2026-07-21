import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FounderPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { adminProvisionAccount } from "@/services/admin.service";
import { getFounderZones, type FounderZone } from "@/services/founder-users.service";

type Role = "customer" | "merchant" | "driver";

const ROLE_LABELS: Record<Role, string> = {
  customer: "زبون",
  merchant: "تاجر",
  driver: "موصل",
};

const VEHICLE_TYPES = ["دراجة نارية", "سيارة", "دراجة هوائية", "شاحنة صغيرة"];

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
  secure,
  keyboard,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: "default" | "email-address" | "phone-pad";
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      secureTextEntry={secure}
      keyboardType={keyboard ?? "default"}
      textAlign="right"
      style={[
        styles.input,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          color: colors.textPrimary,
          borderRadius: tokens.radius.sm,
          padding: tokens.spacing.md,
          fontSize: tokens.typography.sizes.base,
        },
      ]}
    />
  );
}

export default function FounderCreateUserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role: string }>();
  const role: Role = (roleParam as Role) ?? "customer";
  const { colors, tokens } = useAppTheme();

  const [zones, setZones] = useState<FounderZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedZone, setSelectedZone] = useState<FounderZone | null>(null);
  const [address, setAddress] = useState("");

  // Merchant fields
  const [businessName, setBusinessName] = useState("");

  // Driver fields
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  // Customer fields
  const [isGoldMember, setIsGoldMember] = useState(false);

  useEffect(() => {
    getFounderZones().then(setZones);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!fullName.trim()) return setError("الاسم الكامل مطلوب");
    if (!phone.trim()) return setError("رقم الهاتف مطلوب");
    if (!email.trim()) return setError("البريد الإلكتروني مطلوب");
    if (!password || password.length < 6) return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (role === "merchant" && !businessName.trim()) return setError("اسم التجارة مطلوب للتاجر");

    setLoading(true);
    const { data, error: err } = await adminProvisionAccount({
      role,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
      zone_id: selectedZone?.id,
      address: address.trim() || undefined,
      business_name: businessName.trim() || undefined,
      vehicle_type: vehicleType || undefined,
      vehicle_number: vehicleNumber.trim() || undefined,
      is_gold_member: isGoldMember,
    });
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => router.back(), 1800);
    }
  }, [role, fullName, phone, email, password, selectedZone, address, businessName, vehicleType, vehicleNumber, isGoldMember]);

  const title = `إضافة ${ROLE_LABELS[role]}`;

  return (
    <FounderPageShell title={title} showBack scrollable={false}>
      <ScrollView
        contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Common fields */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>المعلومات الأساسية</Text>

          <FieldLabel label="الاسم الكامل" required />
          <FormInput value={fullName} onChange={setFullName} placeholder="أدخل الاسم الكامل" />

          {role === "merchant" && (
            <>
              <FieldLabel label="اسم التجارة" required />
              <FormInput value={businessName} onChange={setBusinessName} placeholder="اسم المتجر أو التجارة" />
            </>
          )}

          <FieldLabel label="رقم الهاتف" required />
          <FormInput value={phone} onChange={setPhone} placeholder="+213..." keyboard="phone-pad" />

          <FieldLabel label="البريد الإلكتروني" required />
          <FormInput value={email} onChange={setEmail} placeholder="example@email.com" keyboard="email-address" />

          <FieldLabel label="كلمة المرور" required />
          <FormInput value={password} onChange={setPassword} placeholder="6 أحرف على الأقل" secure />

          <FieldLabel label="العنوان" />
          <FormInput value={address} onChange={setAddress} placeholder="العنوان التفصيلي" />
        </View>

        {/* Zone picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>المنطقة</Text>
          <TouchableOpacity
            onPress={() => setShowZonePicker(true)}
            style={[
              styles.input,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.sm,
                padding: tokens.spacing.md,
                justifyContent: "flex-end",
              },
            ]}
          >
            <Text style={{ color: selectedZone ? colors.textPrimary : colors.textDisabled, textAlign: "right", fontSize: tokens.typography.sizes.base }}>
              {selectedZone ? `${selectedZone.name} — ${selectedZone.city}` : "اختر المنطقة (اختياري)"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Driver-specific fields */}
        {role === "driver" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>معلومات المركبة</Text>

            <FieldLabel label="نوع المركبة" />
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
                  <Text style={{ color: vehicleType === v ? colors.primary : colors.textSecondary, fontSize: 13 }}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel label="رقم المركبة" />
            <FormInput value={vehicleNumber} onChange={setVehicleNumber} placeholder="رقم لوحة الترخيص" />
          </View>
        )}

        {/* Customer-specific */}
        {role === "customer" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>خيارات إضافية</Text>
            <View style={[styles.switchRow, { borderColor: colors.borderSubtle }]}>
              <Switch
                value={isGoldMember}
                onValueChange={setIsGoldMember}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                thumbColor={isGoldMember ? "#fff" : colors.textDisabled}
              />
              <Text style={{ color: colors.textPrimary, textAlign: "right", flex: 1, fontSize: tokens.typography.sizes.base }}>
                عضو ذهبي 🥇
              </Text>
            </View>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={{ color: colors.error, textAlign: "right", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Success */}
        {success && (
          <View style={[styles.errorBox, { backgroundColor: colors.success + "18", borderColor: colors.success }]}>
            <Text style={{ color: colors.success, textAlign: "right", fontSize: 14 }}>
              تم إنشاء الحساب بنجاح ✓
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || success}
          style={[
            styles.submitBtn,
            {
              backgroundColor: loading || success ? colors.primary + "88" : colors.primary,
              borderRadius: tokens.radius.md,
              padding: tokens.spacing.lg,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: tokens.typography.sizes.base, fontWeight: "700", textAlign: "center" }}>
              {`إنشاء ${ROLE_LABELS[role]}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Zone picker modal */}
      <Modal visible={showZonePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 }}>
              اختر المنطقة
            </Text>
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
                  style={[styles.zoneItem, { borderColor: colors.borderSubtle }]}
                >
                  <Text style={{ color: colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{z.name}</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>{z.city}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowZonePicker(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </FounderPageShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "right" as const,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  input: { borderWidth: 1 },
  switchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  vehicleTypes: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  vehicleChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  submitBtn: { alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "70%" },
  zoneItem: { borderBottomWidth: 1, paddingVertical: 12, gap: 2 },
});
