import { supabase } from "@/lib/supabase";

export interface FounderMetricsSnapshot {
  id: string;
  zone_id: string | null;
  metric_period?: string;
  period_start?: string;
  period_end?: string;
  snapshot_time?: string;
  total_orders: number;
  total_gmv_minor?: number;
  total_commission_minor?: number;
  total_delivery_fees_minor?: number;
  total_revenue_minor?: number;
  active_customers: number;
  active_merchants: number;
  active_drivers: number;
  dispute_count?: number;
  new_users_24h?: number;
  completed_deliveries_24h?: number;
  average_delivery_time_minutes?: number;
  created_at: string;
}

export async function getFounderMetrics(
  period: "daily" | "weekly" | "monthly" = "daily",
  limit = 30
): Promise<FounderMetricsSnapshot[]> {
  let data: FounderMetricsSnapshot[] | null = null;
  let error: { message: string } | null = null;

  const res = await supabase
    .from("platform_metrics_snapshots")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(limit);
  data = (res.data ?? null) as FounderMetricsSnapshot[] | null;
  error = res.error;

  if (error?.message?.includes("period_start") || error?.message?.includes("metric_period")) {
    const res2 = await supabase
      .from("platform_metrics_snapshots")
      .select("*")
      .order("snapshot_time", { ascending: false })
      .limit(limit);
    data = (res2.data ?? null) as FounderMetricsSnapshot[] | null;
    error = res2.error;
  }

  if (error) console.error("getFounderMetrics:", error.message);
  return (data ?? []) as FounderMetricsSnapshot[];
}

export async function getFounderDeliveryPerformance(): Promise<{
  total: number;
  delivered: number;
  cancelled: number;
  avgDeliveryTimeMin: number | null;
  completionRate: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("orders")
    .select("status, placed_at, delivered_at")
    .gte("placed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    return { total: 0, delivered: 0, cancelled: 0, avgDeliveryTimeMin: null, completionRate: 0, error: error?.message ?? null };
  }

  const total = data.length;
  const delivered = data.filter((o) => o.status === "delivered");
  const cancelled = data.filter((o) => o.status === "cancelled" || o.status === "rejected");

  let avgTime: number | null = null;
  const times: number[] = [];
  for (const o of delivered) {
    if (o.delivered_at) {
      const diff = new Date(o.delivered_at).getTime() - new Date(o.placed_at).getTime();
      times.push(diff / 60000);
    }
  }
  if (times.length > 0) avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  return {
    total,
    delivered: delivered.length,
    cancelled: cancelled.length,
    avgDeliveryTimeMin: avgTime,
    completionRate: total > 0 ? Math.round((delivered.length / total) * 100) : 0,
    error: null,
  };
}

export async function getFounderStatsForReports(): Promise<{
  totalCustomers: number | null;
  totalMerchants: number | null;
  totalDrivers: number | null;
  totalStores: number | null;
  totalOrders: number | null;
  activeOrders: number | null;
  completedOrders: number | null;
  gmvMinor: number | null;
  commissionMinor: number | null;
  error: string | null;
}> {
  const [
    customersRes,
    merchantsRes,
    driversRes,
    storesRes,
    ordersRes,
    activeRes,
    completedRes,
    gmvRes,
    commissionRes,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["accepted", "preparing", "ready_for_pickup", "picked_up"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("orders").select("total_minor").eq("status", "delivered"),
    supabase.from("orders").select("platform_commission_minor").eq("status", "delivered"),
  ]);

  if (customersRes.error) return { totalCustomers: null, totalMerchants: null, totalDrivers: null, totalStores: null, totalOrders: null, activeOrders: null, completedOrders: null, gmvMinor: null, commissionMinor: null, error: customersRes.error.message };

  const sumMinor = (rows: Array<{ [key: string]: number | null }> | undefined, field: string): number =>
    (rows ?? []).reduce((sum, row) => sum + (row[field] ?? 0), 0);

  return {
    totalCustomers: customersRes.count ?? null,
    totalMerchants: merchantsRes.count ?? null,
    totalDrivers: driversRes.count ?? null,
    totalStores: storesRes.count ?? null,
    totalOrders: ordersRes.count ?? null,
    activeOrders: activeRes.count ?? null,
    completedOrders: completedRes.count ?? null,
    gmvMinor: sumMinor(gmvRes.data as any, "total_minor"),
    commissionMinor: sumMinor(commissionRes.data as any, "platform_commission_minor"),
    error: null,
  };
}
