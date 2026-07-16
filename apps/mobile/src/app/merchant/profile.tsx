import React, { useEffect, useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BadgeInfo, Phone, MapPinned, ShieldCheck, LogOut, Palette, Wallet } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getMerchant } from "@/services/merchant.service";
import { Merchant } from "@/types/schema-03-core";
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

export default function MerchantProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getMerchant(userId).then((data) => {
      setMerchant(data);
      setLoading(false);
    });
  }, [userId]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("خطأ في تسجيل الخروج", error.message);
    } else {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل حسابك..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}>
        <SectionCard>
          <SectionTitle icon={<BadgeInfo color={colors.primary} size={tokens.spacing.lg} />}>
            بيانات التاجر
          </SectionTitle>
          <WorkspaceRow label="اسم النشاط" value={merchant?.business_name || ""} />
          <WorkspaceRow label="اسم المالك" value={merchant?.owner_full_name || ""} />
          <WorkspaceRow label="الهاتف" value={merchant?.phone || ""} />
          <WorkspaceRow
            label="حالة الحساب"
            value={merchant?.status === "active" ? "نشط" : merchant?.status || ""}
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
            title="طلب مالي"
            variant="outline"
            icon={<Wallet color={colors.primary} size={18} />}
            onPress={() => router.push("/merchant/money-request")}
          />
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
