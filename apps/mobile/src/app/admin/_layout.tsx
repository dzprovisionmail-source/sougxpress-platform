import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { TOKENS } from "@/constants/tokens";

function AdminLoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.center, { backgroundColor: colors.bgBase }]}>
      <ActivityIndicator size="large" color={TOKENS.colors.brandPrimary} />
      <Text
        style={[
          styles.msg,
          {
            color: colors.textSecondary,
            fontFamily: TOKENS.typography.families.arabic,
            fontSize: TOKENS.typography.sizes.base,
          },
        ]}
      >
        جاري التحقق من الصلاحيات...
      </Text>
    </SafeAreaView>
  );
}

function AdminUnauthorizedScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.center, { backgroundColor: colors.bgBase }]}>
      <Text style={styles.icon}>🚫</Text>
      <Text
        style={[
          styles.msg,
          {
            color: colors.error,
            fontFamily: TOKENS.typography.families.arabic,
            fontSize: TOKENS.typography.sizes.base,
            textAlign: "center",
          },
        ]}
      >
        غير مخوّل بالدخول إلى لوحة الإدارة
      </Text>
    </SafeAreaView>
  );
}

/**
 * Protected Admin layout.
 * Verifies public.profiles.role is "admin" or "founder" before rendering.
 * All other cases trigger a safe redirect via useAdminProfile.
 */
export default function AdminLayout() {
  const { loading, authorized } = useAdminProfile();

  if (loading) {
    return <AdminLoadingScreen />;
  }

  if (!authorized) {
    return <AdminUnauthorizedScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="merchants" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="products" />
      <Stack.Screen name="zones" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="content" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="audit-logs" />
      <Stack.Screen name="settings" />
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
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
});
