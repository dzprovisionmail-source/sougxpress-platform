import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DollarSign } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function FounderFinanceScreen() {
  const { colors } = useAppTheme();
  return (
    <AdminPageShell title="المالية" showBack>
      <View style={styles.center}>
        <DollarSign size={56} color={colors.textDisabled} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          قيد البناء
        </Text>
        <Text style={[styles.sub, { color: colors.textDisabled }]}>
          التقارير المالية والمدفوعات ستكون متاحة في المرحلة القادمة
        </Text>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
