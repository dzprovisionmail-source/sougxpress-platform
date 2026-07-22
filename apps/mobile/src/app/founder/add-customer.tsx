import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function FounderAddCustomerScreen() {
  const { colors, tokens } = useAppTheme();

  const goToCreate = useCallback(() => {
    router.push("/founder/users/create?role=customer" as never);
  }, []);

  return (
    <AdminPageShell showLogout title="إضافة زبون" showBack>
      <View style={styles.center}>
        <UserPlus size={56} color={colors.textDisabled} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>إضافة زبون جديد</Text>
        <Text style={[styles.sub, { color: colors.textDisabled }]}>
          أنشئ حساب زبون بالاسم والهاتف فقط، أو أضف بريداً إلكترونياً وكلمة مرور لحساب دخول.
        </Text>
        <TouchableOpacity onPress={goToCreate} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>بدء الإضافة</Text>
        </TouchableOpacity>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  btn: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
