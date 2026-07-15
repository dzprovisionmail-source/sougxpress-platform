import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

const FINANCE_SECTIONS = [
  { key: "summary", label: "ملخص مالي" },
  { key: "settlements", label: "التسويات المعلّقة" },
  { key: "commissions", label: "العمولات والرسوم" },
  { key: "payouts", label: "المدفوعات للتجار" },
  { key: "driver_earnings", label: "أرباح الموصلين" },
  { key: "transactions", label: "سجل المعاملات" },
  { key: "refunds", label: "المبالغ المستردة" },
];

export default function AdminFinancesScreen() {
  const { colors, tokens } = useAppTheme();

  return (
    <AdminPageShell title="المالية والتسويات" showBack>
      <View style={{ paddingTop: tokens.spacing.lg }}>
        {FINANCE_SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.key}
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
                marginBottom: tokens.spacing.md,
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
              },
            ]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.base,
                fontWeight: "600",
                textAlign: "right",
              }}
            >
              {section.label}
            </Text>
            <Text
              style={{
                color: colors.textDisabled,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
              }}
            >
              غير متاح
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
              marginBottom: tokens.spacing.xl,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.sm,
              textAlign: "right",
              lineHeight: 22,
            }}
          >
            يتطلب عرض البيانات المالية ربط جداول المعاملات والتسويات في قاعدة البيانات
          </Text>
        </View>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  note: { borderWidth: 1 },
});
