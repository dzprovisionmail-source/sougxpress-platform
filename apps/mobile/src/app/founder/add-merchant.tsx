import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { FounderPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

/** Phase 2 placeholder — account creation not implemented yet */
export default function FounderAddMerchantScreen() {
  const { colors } = useAppTheme();
  return (
    <FounderPageShell title="إضافة تاجر" showBack>
      <View style={styles.center}>
        <ShoppingBag size={56} color={colors.textDisabled} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>قيد البناء</Text>
        <Text style={[styles.sub, { color: colors.textDisabled }]}>
          إنشاء حسابات التجار سيكون متاحاً في المرحلة الثانية
        </Text>
      </View>
    </FounderPageShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
