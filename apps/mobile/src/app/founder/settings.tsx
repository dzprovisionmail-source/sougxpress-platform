import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert,
} from "react-native";
import { router } from "expo-router";
import { Settings, Save, RotateCcw, Shield, Bell, Truck, DollarSign, Users } from "lucide-react-native";
import { AdminPageShell, AdminLoadingState, AdminErrorState } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getFounderSettings, updateFounderSetting, getFounderAdminProfiles, type FounderPlatformSetting } from "@/services/founder-settings.service";

const DEFAULT_SETTINGS: Record<string, { label: string; type: "number" | "text" | "boolean"; defaultValue: string | number | boolean }> = {
  platform_delivery_fee_minor: { label: "أجور التوصيل الافتراضية (د.ج)", type: "number", defaultValue: 200 },
  platform_commission_rate: { label: "نسبة عمولة المنصة (%)", type: "number", defaultValue: 10 },
  require_merchant_approval: { label: "الموافقة على التجار الجدد", type: "boolean", defaultValue: true },
  require_driver_approval: { label: "الموافقة على الموصلين الجدد", type: "boolean", defaultValue: true },
  enable_notifications: { label: "تفعيل الإشعارات", type: "boolean", defaultValue: true },
  maintenance_mode: { label: "وضع الصيانة", type: "boolean", defaultValue: false },
  max_delivery_radius_km: { label: "أقصى مسافة توصيل (كم)", type: "number", defaultValue: 15 },
};

export default function FounderSettingsScreen() {
  const { colors, tokens } = useAppTheme();
  const [settings, setSettings] = useState<FounderPlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string | number | boolean>>({});
  const [admins, setAdmins] = useState<Array<{ id: string; email: string; role: string; created_at: string }>>([]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [settingsData, adminsData] = await Promise.all([
      getFounderSettings(),
      getFounderAdminProfiles(),
    ]);
    setSettings(settingsData);
    setAdmins(adminsData);
    const draft: Record<string, string | number | boolean> = {};
    for (const s of settingsData) {
      draft[s.key] = typeof s.value === "boolean" ? s.value : String(s.value ?? "");
    }
    setDrafts(draft);
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (key: string) => {
    setSaving(true);
    const raw = drafts[key];
    let value: unknown = raw;
    const def = DEFAULT_SETTINGS[key];
    if (def?.type === "number") value = Number(raw) || 0;
    if (def?.type === "boolean") value = Boolean(raw);

    const { error: err } = await updateFounderSetting(key, value);
    setSaving(false);
    if (err) {
      Alert.alert("خطأ", err);
    } else {
      await loadSettings();
    }
  };

  const handleReset = (key: string) => {
    const def = DEFAULT_SETTINGS[key];
    if (def) {
      setDrafts((d) => ({ ...d, [key]: def.defaultValue }));
    }
  };

  if (loading) {
    return (
      <AdminPageShell title="الإعدادات" showBack>
        <AdminLoadingState message="جاري تحميل الإعدادات..." />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="إعدادات المنصة" showBack>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={{ color: colors.error, textAlign: "right" }}>{error}</Text>
            <TouchableOpacity onPress={loadSettings}><Text style={{ color: colors.primary }}>إعادة المحاولة</Text></TouchableOpacity>
          </View>
        )}

        {/* General */}
        <View style={[styles.section, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Settings size={18} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right" }}>إعدادات عامة</Text>
          </View>
          {Object.entries(DEFAULT_SETTINGS).map(([key, def]) => {
            const current = drafts[key] ?? def.defaultValue;
            return (
              <View key={key} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>{def.label}</Text>
                  {def.type === "boolean" ? (
                    <Switch
                      value={Boolean(current)}
                      onValueChange={(v) => setDrafts((d) => ({ ...d, [key]: v }))}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                      thumbColor={Boolean(current) ? "#fff" : colors.textDisabled}
                    />
                  ) : (
                    <TextInput
                      value={String(current)}
                      onChangeText={(t) => setDrafts((d) => ({ ...d, [key]: def.type === "number" ? Number(t) || 0 : t }))}
                      keyboardType={def.type === "number" ? "numeric" : "default"}
                      textAlign="right"
                      style={[styles.input, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                    />
                  )}
                </View>
                <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                  <TouchableOpacity onPress={() => handleSave(key)} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={14} color="#fff" />}
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" }}>حفظ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReset(key)} style={[styles.saveBtn, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                    <RotateCcw size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "center" }}>إعادة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Admin accounts */}
        <View style={[styles.section, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, marginTop: tokens.spacing.lg }]}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Shield size={18} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right" }}>حسابات المشرفين</Text>
          </View>
          {admins.map((a) => (
            <View key={a.id} style={[styles.adminRow, { borderColor: colors.borderSubtle }]}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", textAlign: "right" }}>{a.email}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right" }}>{a.role === "founder" ? "مؤسس" : "مشرف"} · {new Date(a.created_at).toLocaleDateString("ar-DZ")}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: a.role === "founder" ? colors.warning + "18" : colors.primary + "18", borderColor: a.role === "founder" ? colors.warning + "44" : colors.primary + "44" }]}>
                <Text style={{ color: a.role === "founder" ? colors.warning : colors.primary, fontSize: 11, fontWeight: "700" }}>{a.role === "founder" ? "مؤسس" : "مشرف"}</Text>
              </View>
            </View>
          ))}
          {admins.length === 0 && <Text style={{ color: colors.textDisabled, textAlign: "center", paddingVertical: 12 }}>لا توجد حسابات مشرفين</Text>}
        </View>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: "right", minWidth: 120 },
  saveBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  adminRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
});
