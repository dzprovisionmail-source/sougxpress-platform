import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";

const FounderLogoutContext = React.createContext<{
  onLogout: () => void;
} | null>(null);

export function useFounderLogout() {
  const ctx = React.useContext(FounderLogoutContext);
  if (!ctx) return undefined;
  return ctx.onLogout;
}

function FounderLayoutInner({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const handleLogout = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.signOut();
    } catch (_) {
      // best-effort
    }
  };

  return (
    <FounderLogoutContext.Provider value={{ onLogout: handleLogout }}>
      {children}
    </FounderLogoutContext.Provider>
  );
}

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
    <FounderLayoutInner>
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
      </Stack>
    </FounderLayoutInner>
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
