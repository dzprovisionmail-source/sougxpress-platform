import React, { useMemo, useState } from "react";
import { ScrollView, Alert, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { BadgeInfo, Bike, FolderClosed, LogOut, Palette, TrendingUp, Wallet } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { supabase } from "@/lib/supabase";
import { computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceText,
  WorkspaceButton,
  ThemeSwitcher,
  LoadingState,
} from "@/features/workspace/ui";

const AVAILABILITY_LABEL: Record<string, string> = {
  online: "متصل",
  offline: "غير متصل",
  on_delivery: "في توصيلة",
};

export default function DriverProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading, updateDriver } = useDriver(userId || "");
  const { orders } = useDriverOrders(userId || "", driver?.zone_id);

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const totalHandled = delivered.length + cancelled.length;
    const completionRate = totalHandled > 0 ? Math.round((delivered.length / totalHandled) * 100) : 100;
    const totalEarnings = computeEarningsSplit(delivered.length).driverShareMinor;
    return { totalDeliveries: delivered.length, completionRate, totalEarnings };
  }, [orders]);

  const isOnline = driver?.availability === "online";
  const handleToggleAvailability = async (value: boolean) => {
    await updateDriver({ availability: value ? "online" : "offline" });
  };

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
            حالة التحقق والتوفر
          </SectionTitle>
          <WorkspaceRow
            label="حالة الحساب"
            value={driver?.status === "active" ? "موثق ✅" : driver?.status || ""}
          />
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: tokens.spacing.sm,
            }}
          >
            <WorkspaceText color="secondary" variant="caption">
              حالة التوفر: {AVAILABILITY_LABEL[driver?.availability || "offline"]}
            </WorkspaceText>
            <Switch
              value={isOnline}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<TrendingUp color={colors.primary} size={tokens.spacing.lg} />}>
            إحصائيات الأداء
          </SectionTitle>
          <WorkspaceRow label="إجمالي التوصيلات المكتملة" value={String(stats.totalDeliveries)} />
          <WorkspaceRow label="نسبة إتمام التوصيلات" value={`${stats.completionRate}%`} />
          <WorkspaceRow label="إجمالي الأرباح" value={formatCurrency(stats.totalEarnings)} isLast />
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
            onPress={() => router.push("/driver/money-request")}
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
