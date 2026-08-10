import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function GuestMarketplaceScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    router.replace("/(tabs)/home");
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgBase }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, color: colors.textSecondary }}>جاري التحميل...</Text>
    </View>
  );
}
