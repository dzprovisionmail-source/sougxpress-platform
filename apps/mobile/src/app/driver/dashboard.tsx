import React, { useMemo, useState } from "react";
import { ScrollView, RefreshControl, Switch, View, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Bike, Wallet, PackageCheck, Bell, Search, X } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders, { DriverOrder } from "@/hooks/useDriverOrders";
import { computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import { SearchBar } from "@/components/ui";
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

type FilterKey = "all" | "available" | "active" | "completed";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading: driverLoading, updateDriver } = useDriver(userId || "");
  const { orders, availableOrders, loading, refreshOrders } = useDriverOrders(userId || "", driver?.zone_id);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    const completedToday = todayOrders.filter((o) => o.status === "delivered");
    const completedTotal = orders.filter((o) => o.status === "delivered");
    const cancelledTotal = orders.filter((o) => o.status === "cancelled" || o.assignment_status === "cancelled");
    const pending = orders.filter((o) => ["accepted", "arrived_at_store", "picked_up", "out_for_delivery"].includes(o.assignment_status));
    const completedDeliveryCount = Math.max(driver?.delivery_count ?? 0, completedTotal.length);
    const earningsToday = computeEarningsSplit(completedToday.length).driverShareMinor;
    const totalSplit = computeEarningsSplit(completedDeliveryCount);
    const totalEarnings = totalSplit.driverShareMinor;
    const platformEarnings = 0;
    const availableCount = availableOrders.length;

    return {
      todayCount: todayOrders.length,
      pendingCount: pending.length,
      completedTodayCount: completedToday.length,
      totalDeliveries: completedDeliveryCount,
      earningsToday,
      totalEarnings,
      platformEarnings,
      availableCount,
      cancelledCount: cancelledTotal.length,
    };
  }, [driver?.delivery_count, orders, availableOrders]);

  const isOnline = driver?.availability === "online";

  const handleToggleOnline = async (value: boolean) => {
    await updateDriver({ availability: value ? "online" : "offline" });
  };

  const filteredOrders = useMemo(() => {
    let result: DriverOrder[] = [];
    if (filter === "all" || filter === "available") {
      result = result.concat(availableOrders);
    }
    if (filter === "all" || filter === "active") {
      result = result.concat(orders.filter((o) => ["accepted", "arrived_at_store", "picked_up", "out_for_delivery"].includes(o.assignment_status)));
    }
    if (filter === "all" || filter === "completed") {
      result = result.concat(orders.filter((o) => o.status === "delivered"));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((o) => {
        const storeName = o.store?.name?.toLowerCase() || "";
        const address = o.address?.address_text?.toLowerCase() || "";
        const orderId = o.id.toLowerCase();
        return storeName.includes(q) || address.includes(q) || orderId.includes(q);
      });
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filter, orders, availableOrders, searchQuery]);

  const handleOrderPress = (_order: DriverOrder) => {
    router.push("/driver/deliveries");
  };

  if (driverLoading && !driver) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل ملفك..." />
      </WorkspaceScreen>
    );
  }

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: filteredOrders.length },
    { key: "available", label: "متاحة", count: availableOrders.length },
    { key: "active", label: "الجارية", count: orders.filter((o) => ["accepted", "arrived_at_store", "picked_up", "out_for_delivery"].includes(o.assignment_status)).length },
    { key: "completed", label: "المكتملة", count: orders.filter((o) => o.status === "delivered").length },
  ];

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshOrders} tintColor={colors.primary} />}
      >
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle icon={<Bike color={colors.primary} size={tokens.spacing.lg} />}>
              {`مرحباً ${driver?.full_name || ""}`}
            </SectionTitle>
            <TouchableOpacity onPress={() => router.push("/driver/notifications")}>
              <Bell color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: tokens.spacing.sm }}>
            <WorkspaceText color={isOnline ? "success" : "error"}>
              {isOnline ? "🟢 متصل ومستعد لاستلام الطلبات" : "🔴 غير متصل"}
            </WorkspaceText>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}>
            ملخص المحفظة
          </SectionTitle>
          <StatGrid>
            <StatCard label="إجمالي أرباح الموصل" value={formatCurrency(stats.totalEarnings)} accent={colors.success} />
            <StatCard label="مستحقات رسوم التوصيل" value={formatCurrency(stats.totalEarnings)} accent={colors.warning} />
            <StatCard label="أرباح اليوم" value={formatCurrency(stats.earningsToday)} accent={colors.info} />
          </StatGrid>
          <WorkspaceButton
            title="عرض الأرباح والاشتراك"
            variant="outline"
            onPress={() => router.push("/driver/earnings")}
            style={{ marginTop: tokens.spacing.sm }}
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<PackageCheck color={colors.primary} size={tokens.spacing.lg} />}>
            نشاطي اليوم
          </SectionTitle>
          <StatGrid>
            <StatCard label="طلبات اليوم" value={String(stats.todayCount)} />
            <StatCard label="قيد التوصيل" value={String(stats.pendingCount)} accent={colors.info} />
            <StatCard label="مكتملة اليوم" value={String(stats.completedTodayCount)} accent={colors.success} />
          </StatGrid>
          <StatGrid>
            <StatCard label="إجمالي التوصيلات" value={String(stats.totalDeliveries)} accent={colors.secondary} />
            <StatCard label="ملغاة" value={String(stats.cancelledCount)} accent={colors.error} />
            <StatCard label="طلبات متاحة" value={String(stats.availableCount)} accent={colors.info} />
          </StatGrid>
        </SectionCard>

        <SectionCard>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: tokens.spacing.sm,
            }}
          >
            <SectionTitle icon={<X color={colors.primary} size={tokens.spacing.lg} />}>
              الطلبات
            </SectionTitle>
          </View>

          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  flex: 1,
                  paddingVertical: tokens.spacing.sm,
                  alignItems: "center",
                  borderRadius: tokens.radius.sm,
                  backgroundColor: filter === f.key ? colors.primary : colors.bgSurface,
                  borderWidth: 1,
                  borderColor: filter === f.key ? colors.primary : colors.borderSubtle,
                }}
              >
                <WorkspaceText
                  color={filter === f.key ? "brand" : "secondary"}
                  variant="caption"
                  style={{ fontWeight: filter === f.key ? "700" : "400" }}
                >
                  {f.label} ({f.count})
                </WorkspaceText>
              </TouchableOpacity>
            ))}
          </View>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="بحث في الطلبات..."
            onClear={() => setSearchQuery("")}
            style={{ marginBottom: tokens.spacing.sm }}
          />

          {filteredOrders.length === 0 ? (
            <EmptyState message="لا توجد طلبات مطابقة للفلتر المحدد." />
          ) : (
            filteredOrders.slice(0, 10).map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => handleOrderPress(order)}
                style={{ marginBottom: tokens.spacing.sm }}
              >
                <SectionCard style={{ padding: tokens.spacing.md }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                    <WorkspaceText variant="title" style={{ fontSize: tokens.typography.sizes.sm }}>
                      {order.store?.name || "متجر"}
                    </WorkspaceText>
                    <WorkspaceText
                      variant="caption"
                      style={{
                        color:
                          order.assignment_status === "delivered"
                            ? colors.success
                            : order.assignment_status === "cancelled" || order.assignment_status === "failed"
                            ? colors.error
                            : colors.warning,
                      }}
                    >
                      {order.assignment_status === "pending"
                        ? "متاحة"
                        : order.assignment_status === "accepted"
                        ? "مقبولة"
                        : order.assignment_status === "arrived_at_store"
                        ? "في المتجر"
                        : order.assignment_status === "picked_up"
                        ? "تم الاستلام"
                        : order.assignment_status === "out_for_delivery"
                        ? "في الطريق"
                        : order.assignment_status === "delivered"
                        ? "مكتملة"
                        : order.assignment_status}
                    </WorkspaceText>
                  </View>
                  <WorkspaceText color="secondary" variant="caption" style={{ marginTop: tokens.spacing.xs }}>
                    {order.address?.address_text || "العنوان غير متوفر"}
                  </WorkspaceText>
                  <WorkspaceText color="disabled" variant="caption" style={{ marginTop: 2 }}>
                    {new Date(order.created_at).toLocaleString("ar-DZ")}
                  </WorkspaceText>
                </SectionCard>
              </TouchableOpacity>
            ))
          )}

          {filteredOrders.length > 10 && (
            <WorkspaceButton
              title="عرض جميع التوصيلات"
              variant="outline"
              onPress={() => router.push("/driver/deliveries")}
              style={{ marginTop: tokens.spacing.sm }}
            />
          )}
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
