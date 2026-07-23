import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";

function FounderLoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView
      style={[styles.center, { backgroundColor: colors.bgBase }]}
      edges={["top", "bottom"]}
    >
      <ActivityIndicator size="large" color={TOKENS.colors.brandPrimary} />
      <Text style={[styles.msg, { color: colors.textSecondary }]}>
        جاري التحقق من الصلاحيات...
      </Text>
    </SafeAreaView>
  );
}

function FounderUnauthorizedScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView
      style={[styles.center, { backgroundColor: colors.bgBase }]}
      edges={["top", "bottom"]}
    >
      <Text style={styles.icon}>🚫</Text>
      <Text style={[styles.msg, { color: colors.error, textAlign: "center" }]}>
        غير مخوّل بالدخول إلى منطقة المؤسس
      </Text>
    </SafeAreaView>
  );
}

/**
 * Protected Founder layout.
 * Source of truth: public.profiles.role must be "admin" or "founder".
 * Unauthorized users are redirected by useAdminProfile before this renders.
 */
export default function FounderLayout() {
  const { loading, authorized } = useAdminProfile();

  if (loading) return <FounderLoadingScreen />;
  if (!authorized) return <FounderUnauthorizedScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="users" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="content" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="audit-log" />
      {/* Phase 2 / 3 account-creation placeholders */}
      <Stack.Screen name="add-customer" />
      <Stack.Screen name="add-merchant" />
      <Stack.Screen name="add-driver" />
      <Stack.Screen name="add-store" />
      <Stack.Screen name="add-demo-store" />
      <Stack.Screen name="add-demo-driver" />
      <Stack.Screen name="add-demo-customer" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  msg: {
    marginTop: 16,
    lineHeight: 28,
    fontSize: 15,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
});
