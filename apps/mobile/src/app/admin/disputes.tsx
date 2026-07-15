import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

export default function AdminDisputesScreen() {
  const { tokens } = useAppTheme();

  return (
    <AdminPageShell title="الشكاوى والنزاعات" showBack>
      <View style={{ paddingTop: tokens.spacing.xl }}>
        <AdminEmptyState message="لا توجد شكاوى أو نزاعات نشطة حالياً" />
      </View>
    </AdminPageShell>
  );
}
