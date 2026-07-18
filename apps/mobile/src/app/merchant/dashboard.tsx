import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, RefreshControl, View, Switch } from "react-native";
import { useRouter } from "expo-router";
import {
  PackageCheck,
  Clock3,
  Wallet,
  Bell,
  Store as StoreIcon,
  TrendingUp,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useMerchantOrders from "@/hooks/useMerchantOrders";
import { getMerchant } from "@/services/merchant.service";
import { getStoreByMerchantId } from "@/services/store.service";
import { updateStore } from "@/services/store.service";
import { Merchant, Store } from "@/types/schema-03-core";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  StatGrid,
  StatCard,
  WorkspaceButton,
  WorkspaceText,
  WorkspaceRow,
  LoadingState,
} from "@/features/workspace/ui";

const fmt = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;

const STATUS_LABELS: Record<string, string> = {
  active: "نشط ✅",
  pending_review: "قيد المراجعة ⏳",
  suspended: "موقوف ⛔",
  rejected: "مرفوض ❌",
};

export default function MerchantDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { orders, loading, refreshOrders } = useMerchantOrders(userId ?? "");

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getMerchant(userId).then(setMerchant);
    getStoreByMerchantId(userId).then(setStore);
  }, [userId]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today
    );
    const pending = orders.filter((o) => o.status === "pending");
    const active = orders.filter((o) =>
      ["accepted", "preparing", "ready_for_pickup"].includes(o.status)
    );
    const completed = orders.filter((o) => o.status === "delivered");
    const revenueToday = todayOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + ((o as any).order_total_minor ?? (o as any).subtotal_minor ?? 0), 0);

    return {
      todayCount: todayOrders.length,
      pendingCount: pending.length,
      activeCount: active.length,
      completedCount: completed.length,
      revenueToday,
    };
  }, [orders]);

  const handleToggleOpen = async (value: boolean) => {
    if (!store) return;
    setTogglingOpen(true);
    const updated = await updateStore(store.id, { is_open: value });
    if (updated) setStore(updated);
    setTogglingOpen(false);
  };

  const handleRefresh = async () => {
    await refreshOrders();
    if (userId) {
      getMerchant(userId).then(setMerchant);
      getStoreByMerchantId(userId).then(setStore);
    }
  };

  if (loading && orders.length === 0 && !merchant) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل لوحة التحكم..." />
      </WorkspaceScreen>
    );
  }

  const isStoreOpen = store?.is_open ?? false;

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing["3xl"],
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Store open/close toggle */}
        {store && (
          <SectionCard>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                }}
              >
                <StoreIcon
                  color={isStoreOpen ? colors.success : colors.error}
                  size={22}
                />
                <View style={{ marginRight: tokens.spacing.sm }}>
                  <WorkspaceText variant="title" style={{ marginBottom: 2 }}>
                    {store.name}
                  </WorkspaceText>
                  <WorkspaceText
                    color={isStoreOpen ? "success" : "error"}
                    style={{ fontSize: tokens.typography.sizes.sm }}
                  >
                    {isStoreOpen ? "🟢 المتجر مفتوح" : "🔴 المتجر مغلق"}
                  </WorkspaceText>
                </View>
              </View>
              <Switch
                value={isStoreOpen}
                onValueChange={handleToggleOpen}
                disabled={togglingOpen}
                trackColor={{
                  false: colors.borderSubtle,
                  true: colors.success,
                }}
                thumbColor={colors.textOnBrand}
              />
            </View>
          </SectionCard>
        )}

        {/* Today overview */}
        <SectionCard>
          <SectionTitle>نظرة عامة على اليوم</SectionTitle>
          <StatGrid>
            <StatCard
              label="طلبات اليوم"
              value={String(stats.todayCount)}
            />
            <StatCard
              label="إيرادات اليوم"
              value={fmt(stats.revenueToday)}
              accent={colors.success}
            />
          </StatGrid>
        </SectionCard>

        {/* Order pipeline */}
        <SectionCard>
          <SectionTitle
            icon={
              <PackageCheck color={colors.primary} size={tokens.spacing.lg} />
            }
          >
            مركز الطلبات
          </SectionTitle>
          <StatGrid>
            <StatCard
              label="جديدة"
              value={String(stats.pendingCount)}
              accent={
                stats.pendingCount > 0 ? colors.warning : colors.textSecondary
              }
            />
            <StatCard
              label="قيد التنفيذ"
              value={String(stats.activeCount)}
              accent={colors.info}
            />
            <StatCard
              label="مكتملة"
              value={String(stats.completedCount)}
              accent={colors.success}
            />
          </StatGrid>
          <WorkspaceButton
            title="فتح مركز الطلبات"
            onPress={() => router.push("/merchant/orders")}
            style={{ marginTop: tokens.spacing.md }}
          />
        </SectionCard>

        {/* Quick actions */}
        <SectionCard>
          <SectionTitle
            icon={
              <Clock3 color={colors.primary} size={tokens.spacing.lg} />
            }
          >
            إجراءات سريعة
          </SectionTitle>
          <WorkspaceButton
            title="إدارة المتجر والمنتجات"
            variant="outline"
            onPress={() => router.push("/merchant/store")}
            style={{ marginBottom: tokens.spacing.sm }}
          />
          <WorkspaceButton
            title="عرض الأرباح والإحصاءات"
            variant="outline"
            icon={<Wallet color={colors.primary} size={18} />}
            onPress={() => router.push("/merchant/earnings")}
            style={{ marginBottom: tokens.spacing.sm }}
          />
          <WorkspaceButton
            title="الإشعارات"
            variant="ghost"
            icon={<Bell color={colors.primary} size={18} />}
            onPress={() => router.push("/merchant/notifications")}
          />
        </SectionCard>

        {/* Account status */}
        {merchant && (
          <SectionCard>
            <SectionTitle
              icon={
                <TrendingUp color={colors.primary} size={tokens.spacing.lg} />
              }
            >
              حالة الحساب
            </SectionTitle>
            <WorkspaceRow
              label="حالة الحساب"
              value={STATUS_LABELS[merchant.status] ?? merchant.status}
            />
            <WorkspaceRow
              label="نسبة العمولة"
              value={`${merchant.commission_rate ?? 0}%`}
            />
            <WorkspaceRow
              label="نوع الاشتراك"
              value="الباقة الأساسية"
              isLast
            />
          </SectionCard>
        )}
      </ScrollView>
    </WorkspaceScreen>
  );
}
