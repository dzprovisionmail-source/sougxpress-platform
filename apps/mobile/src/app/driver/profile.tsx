import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BadgeInfo, Bike, FolderClosed, Star, LogOut, Palette } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import { supabase } from "@/lib/supabase";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceButton,
  ThemeSwitcher,
  LoadingState,
} from "@/features/workspace/ui";

export default function DriverProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading } = useDriver(userId || "");

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("خطأ في تسجيل الخروج", error.message);
    } else {
      router.replace("/");
    }
  };

  if (loading && !driver) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل ملفك..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}>
        <SectionCard>
          <SectionTitle icon={<BadgeInfo color={colors.primary} size={tokens.spacing.lg} />}>
            بياناتي
          </SectionTitle>
          <WorkspaceRow label="الاسم" value={driver?.full_name || ""} />
          <WorkspaceRow label="الهاتف" value={driver?.phone || ""} />
          <WorkspaceRow label="البريد الإلكتروني" value={driver?.email || ""} />
          <WorkspaceRow label="المدينة" value={driver?.city || ""} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Bike color={colors.primary} size={tokens.spacing.lg} />}>
            مركبتي
          </SectionTitle>
          <WorkspaceRow label="نوع المركبة" value={driver?.vehicle_type || ""} />
          <WorkspaceRow label="العلامة" value={driver?.vehicle_make || ""} />
          <WorkspaceRow label="اللون" value={driver?.vehicle_color || ""} />
          <WorkspaceRow label="رقم التسجيل" value={driver?.license_plate || ""} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<FolderClosed color={colors.primary} size={tokens.spacing.lg} />}>
            حالة التحقق
          </SectionTitle>
          <WorkspaceRow
            label="حالة الحساب"
            value={driver?.status === "active" ? "موثق ✅" : driver?.status || ""}
            isLast
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Palette color={colors.primary} size={tokens.spacing.lg} />}>
            مظهر التطبيق
          </SectionTitle>
          <ThemeSwitcher />
        </SectionCard>

        <SectionCard>
          <WorkspaceButton
            title="تسجيل الخروج"
            variant="danger"
            icon={<LogOut color={colors.textOnBrand} size={18} />}
            onPress={handleLogout}
          />
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
