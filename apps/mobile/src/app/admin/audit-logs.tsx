import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell, AdminEmptyState } from "@/components/admin";

export default function AdminAuditLogsScreen() {
  const { tokens } = useAppTheme();

  return (
    <AdminPageShell title="سجل العمليات" showBack>
      <View style={{ paddingTop: tokens.spacing.xl }}>
        <AdminEmptyState message="لا توجد عمليات مسجّلة حالياً" />
      </View>
    </AdminPageShell>
  );
}
