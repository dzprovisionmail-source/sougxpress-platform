import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";

interface SettingSection {
  title: string;
  items: string[];
}

const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "الإعدادات العامة",
    items: ["اسم المنصة", "معلومات الاتصال", "اللغة الافتراضية"],
  },
  {
    title: "الهوية البصرية",
    items: ["الشعار", "الألوان الرسمية", "الخطوط"],
  },
  {
    title: "إعدادات التوصيل",
    items: ["رسوم التوصيل", "أوقات التوصيل", "حد المسافة"],
  },
  {
    title: "إعدادات الطلبات",
    items: ["الحد الأدنى للطلب", "وقت الإلغاء", "الطلبات المجدولة"],
  },
  {
    title: "إعدادات الدفع والتسوية",
    items: ["طرق الدفع", "نسب العمولة", "جداول التسوية"],
  },
  {
    title: "إعدادات المناطق",
    items: ["إدارة مناطق التوصيل", "حدود الخدمة"],
  },
  {
    title: "إعدادات الإشعارات",
    items: ["قنوات الإشعار", "قوالب الرسائل", "جدولة الإشعارات"],
  },
  {
    title: "إعدادات التشغيل والصيانة",
    items: ["وضع الصيانة", "أوقات العمل", "تحديثات النظام"],
  },
  {
    title: "الأمان والصلاحيات",
    items: ["إدارة الأدوار", "سجل الدخول", "سياسات كلمة المرور"],
  },
  {
    title: "إعدادات التطبيق",
    items: ["إصدار التطبيق", "سياسة الخصوصية", "شروط الاستخدام"],
  },
];

export default function AdminSettingsScreen() {
  const { colors, tokens } = useAppTheme();

  return (
    <AdminPageShell title="إعدادات المنصة" showBack>
      <View style={{ paddingTop: tokens.spacing.lg }}>
        {SETTINGS_SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[
              styles.sectionBlock,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.md,
                marginBottom: tokens.spacing.lg,
                overflow: "hidden",
              },
            ]}
          >
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: colors.bgSurface,
                  borderBottomColor: colors.borderSubtle,
                  paddingHorizontal: tokens.spacing.lg,
                  paddingVertical: tokens.spacing.md,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.textPrimary,
                    fontFamily: tokens.typography.families.arabic,
                    fontSize: tokens.typography.sizes.base,
                  },
                ]}
              >
                {section.title}
              </Text>
            </View>

            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                style={[
                  styles.settingRow,
                  {
                    borderBottomColor: colors.borderSubtle,
                    borderBottomWidth: idx < section.items.length - 1 ? 1 : 0,
                    paddingHorizontal: tokens.spacing.lg,
                    paddingVertical: tokens.spacing.md,
                  },
                ]}
              >
                <ChevronLeft color={colors.textDisabled} size={16} />
                <Text
                  style={[
                    styles.settingLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: tokens.typography.families.arabic,
                      fontSize: tokens.typography.sizes.base,
                      flex: 1,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View
          style={[
            styles.note,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
              marginBottom: tokens.spacing.xl,
            },
          ]}
        >
          <Text
            style={[
              styles.noteText,
              {
                color: colors.textSecondary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
              },
            ]}
          >
            تعديل الإعدادات يتطلب ربط جداول الإعدادات في قاعدة البيانات
          </Text>
        </View>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  sectionBlock: { borderWidth: 1 },
  sectionHeader: { borderBottomWidth: 1 },
  sectionTitle: { fontWeight: "700", textAlign: "right" },
  settingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  settingLabel: { textAlign: "right" },
  note: { borderWidth: 1 },
  noteText: { textAlign: "right", lineHeight: 22 },
});
