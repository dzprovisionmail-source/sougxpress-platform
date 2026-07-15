import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

export default function AdminFinanceScreen() {
  const { colors, tokens } = useAppTheme();

  return (
    <AdminPageShell title="المالية والتسويات" showBack>
      <View style={styles.sections}>
        <InfoSection title="ملخص مالي" colors={colors} tokens={tokens}>
          <AdminEmptyState message="البيانات المالية غير متاحة حالياً" />
        </InfoSection>
        <InfoSection title="التسويات المعلّقة" colors={colors} tokens={tokens}>
          <AdminEmptyState message="لا توجد تسويات معلّقة" />
        </InfoSection>
        <InfoSection title="سجل المعاملات" colors={colors} tokens={tokens}>
          <AdminEmptyState message="لا توجد معاملات مسجّلة" />
        </InfoSection>
      </View>
    </AdminPageShell>
  );
}

function InfoSection({
  title,
  children,
  colors,
  tokens,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
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
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { paddingTop: 16 },
  section: { borderWidth: 1 },
  sectionTitle: {
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 12,
  },
});
