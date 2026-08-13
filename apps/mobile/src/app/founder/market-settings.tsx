import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ArrowRight, Settings, CheckCircle2 } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import {
  getMarketSectionSettings,
  updateMarketSectionSettings,
  type MarketSectionSettings,
} from "@/services/heroSlider.service";

export default function FounderMarketSettingsScreen() {
  const { colors, tokens } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<MarketSectionSettings>({
    showSpecialOffers: true,
    showNewStores: true,
    showAllStores: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await getMarketSectionSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateMarketSectionSettings(settings);
    setSaving(false);
    if (res.success) {
      Alert.alert("نجاح", "تم حفظ إعدادات أقسام السوق بنجاح");
    } else {
      Alert.alert("خطأ", res.error || "تعذّر حفظ الإعدادات");
    }
  };

  return (
    <AdminPageShell title="إعدادات السوق والأقسام">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Back */}
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          onPress={() => router.back()}
        >
          <ArrowRight size={18} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
            العودة للوحة التحكم
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
              جاري تحميل إعدادات السوق...
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.cardHeader, { flexDirection: 'row-reverse' }]}>
              <Settings size={22} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                تحكم في ظهور أقسام واجهة السوق (Marketplace)
              </Text>
            </View>

            <Text style={[styles.cardDesc, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
              قم بتفعيل أو إخفاء الأقسام الرئيسية في واجهة العملاء للتحكم الكامل في تجربة التصفح.
            </Text>

            {/* Toggle 1: Special Offers */}
            <View style={[styles.settingRow, { flexDirection: 'row-reverse', borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                  قسم العروض الخاصة (Special Offers)
                </Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
                  عرض المتاجر المميزة والعروض الترويجية النشطة للعملاء في الواجهة الرئيسية.
                </Text>
              </View>
              <Switch
                value={settings.showSpecialOffers}
                onValueChange={(val) => setSettings({ ...settings, showSpecialOffers: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            {/* Toggle 2: New Stores */}
            <View style={[styles.settingRow, { flexDirection: 'row-reverse', borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                  قسم المتاجر الجديدة (New Stores)
                </Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
                  إظهار المتاجر حديثة الإنشاء تلقائياً لتعزيز ظهورها الفوري.
                </Text>
              </View>
              <Switch
                value={settings.showNewStores}
                onValueChange={(val) => setSettings({ ...settings, showNewStores: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            {/* Toggle 3: All / Nearby Stores */}
            <View style={[styles.settingRow, { flexDirection: 'row-reverse', borderBottomColor: 'transparent' }]}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                  قسم جميع المتاجر / المتاجر القريبة
                </Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
                  عرض قائمة المتاجر الكاملة والمتاجر القريبة بناءً على الفئات.
                </Text>
              </View>
              <Switch
                value={settings.showAllStores}
                onValueChange={(val) => setSettings({ ...settings, showAllStores: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textOnBrand} />
              ) : (
                <View style={[styles.saveBtnContent, { flexDirection: 'row-reverse' }]}>
                  <CheckCircle2 size={18} color={colors.textOnBrand} />
                  <Text style={[styles.saveBtnText, { color: colors.textOnBrand, fontFamily: tokens.typography.families.arabic }]}>
                    حفظ إعدادات السوق
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  cardDesc: {
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 24,
    lineHeight: 20,
  },
  settingRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginStart: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  settingSub: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnContent: {
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
