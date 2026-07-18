import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Users } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function FounderUsersScreen() {
  const { colors, tokens } = useAppTheme();
  return (
    <AdminPageShell title="المستخدمون" showBack>
      <View style={styles.center}>
        <Users size={56} color={colors.textDisabled} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          قيد البناء
        </Text>
        <Text style={[styles.sub, { color: colors.textDisabled }]}>
          إدارة الزبائن والتجار ستكون متاحة في المرحلة القادمة
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
