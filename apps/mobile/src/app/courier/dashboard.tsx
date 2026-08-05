import React, { useMemo, useState } from "react";
import { ScrollView, RefreshControl, Switch, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Bike, Wallet, PackageCheck, Bell, Settings, Share2, MapPin, Clock } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourier from "@/hooks/useCourier";
import useCourierOrders from "@/hooks/useCourierOrders";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  StatGrid,
  StatCard,
  WorkspaceButton,
  WorkspaceText,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

export default function CourierDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId, loading: userLoading } = useCurrentUserId();
  const { courier, loading: courierLoading, updateCourier } = useCourier(userId || "");
  const { pendingDeliveries, activeDeliveries, completedDeliveries, earnings } = useCourierOrders(courier?.id || "");

  const [refreshing, setRefreshing] = useState(false);

  const isOnline = courier?.is_available;

  const handleToggleAvailability = async (value: boolean) => {
    await updateCourier({ is_available: value });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (userLoading || courierLoading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل ملفك..." />
      </WorkspaceScreen>
    );
  }

  if (!courier) {
    return (
      <WorkspaceScreen>
        <EmptyState message="لم يتم العثور على ملف الموصل" />
      </WorkspaceScreen>
    );
  }

  const profileCompletion = useMemo(() => {
    let score = 0;
    if (courier.full_name) score += 20;
    if (courier.phone_number) score += 20;
    if (courier.bio) score += 20;
    if (courier.avatar_url) score += 20;
    if (courier.vehicle_photo_url) score += 10;
    if (courier.vehicle_type) score += 10;
    return Math.min(score, 100);
  }, [courier]);

  const stats = useMemo(() => {
    return {
      totalDeliveries: courier.delivery_count ?? 0,
      rating: courier.rating ?? 5.0,
      earnings: earnings ? `${((earnings.total / 100)).toFixed(2)} دج` : "0",
    };
  }, [courier, earnings]);

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle icon={<Bike color={colors.primary} size={tokens.spacing.lg} />}>
              {`مرحباً ${courier.full_name || ""}`}
            </SectionTitle>
            <TouchableOpacity onPress={() => router.push("/courier/notifications" as never)}>
              <Bell color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: tokens.spacing.sm }}>
            <WorkspaceText color={isOnline ? "success" : "error"}>
              {isOnline ? "🟢 متاح لتلقي الطلبات" : "🔴 غير متاح"}
            </WorkspaceText>
            <Switch
              value={isOnline}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>

          <View style={{ marginTop: tokens.spacing.md, paddingTop: tokens.spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
              <WorkspaceText color="secondary" variant="caption">
                اكتمال الملف
              </WorkspaceText>
              <WorkspaceText variant="caption" style={{ fontWeight: "700" }}>
                {profileCompletion}%
              </WorkspaceText>
            </View>
            <View style={{ height: 6, backgroundColor: colors.borderSubtle, borderRadius: 3, marginTop: tokens.spacing.xs, overflow: "hidden" }}>
              <View style={{ width: `${profileCompletion}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 3 }} />
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            ملخص المحفظة
          </SectionTitle>
          <StatGrid>
            <StatCard label="إجمالي الأرباح" value={stats.earnings} accent={colors.success} />
            <StatCard label="التقييم" value={stats.rating.toFixed(1)} accent={colors.warning} />
          </StatGrid>
          <WorkspaceButton
            title="عرض تفاصيل الأرباح"
            variant="outline"
            onPress={() => router.push("/courier/earnings" as never)}
            style={{ marginTop: tokens.spacing.sm }}
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<PackageCheck color={colors.primary} size={tokens.spacing.lg} />}>
            نشاطي
          </SectionTitle>
          <StatGrid>
            <StatCard label="إجمالي التوصيلات" value={String(stats.totalDeliveries)} accent={colors.secondary} />
            <StatCard label="التقييم" value={stats.rating.toFixed(1)} accent={colors.warning} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Clock color={colors.primary} size={tokens.spacing.lg} />}>
            التوصيلات الحالية
          </SectionTitle>
          <StatGrid>
            <StatCard label="بانتظار القبول" value={String(pendingDeliveries.length)} accent="secondary" />
            <StatCard label="نشطة" value={String(activeDeliveries.length)} accent={colors.primary} />
            <StatCard label="مكتملة" value={String(completedDeliveries.length)} accent={colors.success} />
          </StatGrid>
          <WorkspaceButton
            title="عرض جميع التوصيلات"
            variant="outline"
            onPress={() => router.push("/courier/deliveries" as never)}
            style={{ marginTop: tokens.spacing.sm }}
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<MapPin color={colors.primary} size={tokens.spacing.lg} />}>
            إجراءات سريعة
          </SectionTitle>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, flexWrap: "wrap" }}>
            <WorkspaceButton
              title="التوصيلات"
              variant="outline"
              onPress={() => router.push("/courier/deliveries" as never)}
              style={{ flex: 1, minWidth: 140 }}
              icon={<Clock size={18} />}
            />
            <WorkspaceButton
              title="الأرباح"
              variant="outline"
              onPress={() => router.push("/courier/earnings" as never)}
              style={{ flex: 1, minWidth: 140 }}
              icon={<Wallet size={18} />}
            />
            <WorkspaceButton
              title="السجل"
              variant="outline"
              onPress={() => router.push("/courier/delivery-history" as never)}
              style={{ flex: 1, minWidth: 140 }}
              icon={<Clock size={18} />}
            />
            <WorkspaceButton
              title="تعديل الملف"
              variant="outline"
              onPress={() => router.push("/courier/profile-edit" as never)}
              style={{ flex: 1, minWidth: 140 }}
              icon={<Settings size={18} />}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Bell color={colors.primary} size={tokens.spacing.lg} />}>
            الإشعارات الأخيرة
          </SectionTitle>
          <EmptyState message="لا توجد إشعارات جديدة" />
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
