import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

const CONTENT_SECTIONS = [
  { key: "slider", label: "السلايدر الرئيسي" },
  { key: "banners", label: "البانرات الإعلانية" },
  { key: "featured", label: "المتاجر المميزة" },
  { key: "categories", label: "الفئات المعروضة" },
];

export default function AdminContentScreen() {
  const { colors, tokens } = useAppTheme();

  return (
    <AdminPageShell title="السلايدر والمحتوى" showBack>
      <View style={{ paddingTop: tokens.spacing.lg }}>
        {CONTENT_SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.key}
            activeOpacity={0.8}
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
                marginBottom: tokens.spacing.md,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: colors.textPrimary,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.base,
                },
              ]}
            >
              {section.label}
            </Text>
            <Text
              style={[
                styles.unavailable,
                {
                  color: colors.textDisabled,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.sm,
                },
              ]}
            >
              غير متاح حالياً
            </Text>
          </TouchableOpacity>
        ))}

        <View
          style={[
            styles.note,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
              marginTop: tokens.spacing.md,
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
            إدارة المحتوى تتطلب ربط قاعدة البيانات بجداول المحتوى المناسبة
          </Text>
        </View>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  sectionCard: { borderWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { fontWeight: "600", textAlign: "right" },
  unavailable: { textAlign: "right" },
  note: { borderWidth: 1 },
  noteText: { textAlign: "right", lineHeight: 22 },
});
