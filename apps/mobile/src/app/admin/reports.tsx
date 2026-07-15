import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

const REPORT_TYPES = [
  { key: "sales", label: "تقرير المبيعات" },
  { key: "orders", label: "تقرير الطلبات" },
  { key: "users", label: "تقرير المستخدمين" },
  { key: "drivers", label: "تقرير الموصلين" },
  { key: "zones", label: "تقرير المناطق" },
];

export default function AdminReportsScreen() {
  const { colors, tokens } = useAppTheme();

  return (
    <AdminPageShell title="التقارير" showBack>
      <View style={{ paddingTop: tokens.spacing.lg }}>
        {REPORT_TYPES.map((report) => (
          <TouchableOpacity
            key={report.key}
            activeOpacity={0.8}
            style={[
              styles.card,
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
                styles.cardLabel,
                {
                  color: colors.textPrimary,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.base,
                },
              ]}
            >
              {report.label}
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
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontWeight: "600", textAlign: "right" },
  unavailable: { textAlign: "right" },
});
