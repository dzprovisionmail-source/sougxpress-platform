import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Truck } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function FounderDriversScreen() {
  const { colors, tokens } = useAppTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/founder/users/drivers" as never);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AdminPageShell showLogout title="الموصلون" showBack>
      <View style={styles.center}>
        <Truck size={48} color={colors.textDisabled} />
        <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: "center" }}>
          جاري التوجيه إلى إدارة الموصلين...
        </Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
});
