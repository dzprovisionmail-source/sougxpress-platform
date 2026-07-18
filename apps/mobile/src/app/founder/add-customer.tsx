import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { UserPlus } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

/** Phase 2 placeholder — account creation not implemented yet */
export default function FounderAddCustomerScreen() {
  const { colors } = useAppTheme();
  return (
    <AdminPageShell title="إضافة زبون" showBack>
      <View style={styles.center}>
        <UserPlus size={56} color={colors.textDisabled} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>قيد البناء</Text>
        <Text style={[styles.sub, { color: colors.textDisabled }]}>
          إنشاء حسابات الزبائن سيكون متاحاً في المرحلة الثانية
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
