import React from "react";
import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Palette, Bell, Shield, HelpCircle } from "lucide-react-native";

import { WorkspaceScreen, SectionCard, SectionTitle, WorkspaceText, WorkspaceButton, WorkspaceRow, ThemeSwitcher } from "@/features/workspace/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function CourierSettingsScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();

  const handleLogout = async () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
      >
        <SectionCard>
          <SectionTitle icon={<Palette color={colors.primary} size={tokens.spacing.lg} />}>
            المظهر
          </SectionTitle>
          <ThemeSwitcher />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Bell color={colors.primary} size={tokens.spacing.lg} />}>
            الإشعارات
          </SectionTitle>
          <WorkspaceRow label="تفعيل الإشعارات" value="مفعل" icon={<Bell color={colors.primary} size={18} />} />
          <WorkspaceRow label="إشعارات الطلبات" value="مفعل" isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Shield color={colors.primary} size={tokens.spacing.lg} />}>
            الخصوصية والأمان
          </SectionTitle>
          <WorkspaceRow label="تغيير كلمة المرور" value="" icon={<Shield color={colors.primary} size={18} />} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<HelpCircle color={colors.primary} size={tokens.spacing.lg} />}>
            الدعم
          </SectionTitle>
          <WorkspaceRow label="مركز المساعدة" value="" icon={<HelpCircle color={colors.primary} size={18} />} isLast />
        </SectionCard>

        <View style={{ marginHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.xl }}>
          <WorkspaceButton
            title="تسجيل الخروج"
            variant="danger"
            onPress={handleLogout}
            icon={<LogOut size={18} color={colors.textOnBrand} />}
          />
        </View>
      </ScrollView>
    </WorkspaceScreen>
  );
}
