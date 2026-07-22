import { supabase } from "@/lib/supabase";

/**
 * Founder Control Center service — live Supabase statistics and activity feed.
 * All reads use the calling user's JWT; no service_role in the mobile bundle.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FounderDashboardStats {
  totalCustomers:              number | null;
  totalMerchants:              number | null;
  totalDrivers:                number | null;
  totalAdmins:                 number | null;
  totalStores:                 number | null;
  activeStores:                number | null;
  pendingMerchants:            number | null;
  pendingDrivers:              number | null;
  activeOrders:                number | null;
  completedOrders:             number | null;
  cancelledOrders:             number | null;
  suspendedAccounts:           number | null;
  totalCompletedDeliveries:    number | null;
  driverCommissionsOwedMinor:  number | null;
}

export interface ControlCenterStats {
  // Overview
  totalCustomers: number | null;
  totalMerchants: number | null;
  totalDrivers: number | null;
  totalStores: number | null;
  totalOrders: number | null;

  // Order breakdowns
  ordersToday: number | null;
  ordersThisWeek: number | null;
  ordersThisMonth: number | null;
  activeOrders: number | null;
  pendingOrders: number | null;
  completedOrders: number | null;
  cancelledOrders: number | null;

  // Approvals
  pendingMerchants: number | null;
  pendingDrivers: number | null;

  // Stores
  activeStores: number | null;
  inactiveStores: number | null;

  // Revenue & commissions
  totalGMVMinor: number | null;
  platformCommissionMinor: number | null;
  deliveryFeesMinor: number | null;
  driverCommissionsOwedMinor: number | null;
  totalPayoutsMinor: number | null;

  // Deliveries
  totalCompletedDeliveries: number | null;
  activeDeliveries: number | null;
}

export interface AdminAuditLogEntry {
  id:             string;
  admin_user_id:  string;
  action:         string;
  entity_type:    string;
  entity_id:      string | null;
  details:        Record<string, unknown> | null;
  created_at:     string;
}

export interface ActivityFeedEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ─── Helper: date range ISO strings ──────────────────────────────────────────

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Founder Dashboard Stats (Phase 1) ────────────────────────────────────────

export async function getFounderDashboardStats(): Promise<FounderDashboardStats> {
  const [
    customersRes,
    merchantsRes,
    driversRes,
    adminsRes,
    totalStoresRes,
    activeStoresRes,
    pendingMerchantsRes,
    pendingDriversRes,
    activeOrdersRes,
    completedOrdersRes,
    cancelledOrdersRes,
    suspCustomersRes,
    suspMerchantsRes,
    suspDriversRes,
    deliveriesRes,
    commissionsRes,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "accepted", "preparing", "ready_for_pickup", "picked_up"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["cancelled", "rejected"]),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase
      .from("delivery_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    supabase
      .from("delivery_commission_cycles")
      .select("commission_earned_minor")
      .eq("status", "payment_due"),
  ]);

  const suspendedTotal =
    (suspCustomersRes.count ?? 0) +
    (suspMerchantsRes.count ?? 0) +
    (suspDriversRes.count ?? 0);

  let commissionsOwed: number | null = null;
  if (!commissionsRes.error && commissionsRes.data) {
    commissionsOwed = (commissionsRes.data as Array<{ commission_earned_minor: number }>).reduce(
      (sum, row) => sum + (row.commission_earned_minor ?? 0),
      0
    );
  }

  return {
    totalCustomers:             customersRes.count ?? null,
    totalMerchants:             merchantsRes.count ?? null,
    totalDrivers:               driversRes.count ?? null,
    totalAdmins:                adminsRes.count ?? null,
    totalStores:                totalStoresRes.count ?? null,
    activeStores:               activeStoresRes.count ?? null,
    pendingMerchants:           pendingMerchantsRes.count ?? null,
    pendingDrivers:             pendingDriversRes.count ?? null,
    activeOrders:               activeOrdersRes.count ?? null,
    completedOrders:            completedOrdersRes.count ?? null,
    cancelledOrders:            cancelledOrdersRes.count ?? null,
    suspendedAccounts:          suspendedTotal,
    totalCompletedDeliveries:   deliveriesRes.count ?? null,
    driverCommissionsOwedMinor: commissionsOwed,
  };
}

// ─── Control Center Stats (Phase 2 Module 1) ──────────────────────────────────

export async function getControlCenterStats(): Promise<ControlCenterStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [
    totalCustomersRes,
    totalMerchantsRes,
    totalDriversRes,
    totalStoresRes,
    totalOrdersRes,
    ordersTodayRes,
    ordersWeekRes,
    ordersMonthRes,
    activeOrdersRes,
    pendingOrdersRes,
    completedOrdersRes,
    cancelledOrdersRes,
    pendingMerchantsRes,
    pendingDriversRes,
    activeStoresRes,
    inactiveStoresRes,
    gmvRes,
    commissionRes,
    deliveryFeesRes,
    payoutsRes,
    activeDeliveriesRes,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["accepted", "preparing", "ready_for_pickup", "picked_up"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["cancelled", "rejected"]),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("stores").select("id", { count: "exact", head: true }).neq("status", "active"),
    supabase
      .from("orders")
      .select("order_total_minor")
      .eq("status", "delivered"),
    supabase
      .from("orders")
      .select("platform_commission_minor")
      .eq("status", "delivered"),
    supabase
      .from("orders")
      .select("delivery_fee_minor")
      .eq("status", "delivered"),
    supabase
      .from("payouts")
      .select("amount_minor")
      .eq("status", "paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["ready_for_pickup", "picked_up"]),
  ]);

  const sumMinor = (rows: Array<{ [key: string]: number | null }> | undefined, field: string): number | null => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce((sum, row) => sum + (row[field] ?? 0), 0);
  };

  const gmv = sumMinor(gmvRes.data as any, "order_total_minor");
  const commission = sumMinor(commissionRes.data as any, "platform_commission_minor");
  const deliveryFees = sumMinor(deliveryFeesRes.data as any, "delivery_fee_minor");
  const payouts = sumMinor(payoutsRes.data as any, "amount_minor");

  return {
    totalCustomers: totalCustomersRes.count ?? null,
    totalMerchants: totalMerchantsRes.count ?? null,
    totalDrivers: totalDriversRes.count ?? null,
    totalStores: totalStoresRes.count ?? null,
    totalOrders: totalOrdersRes.count ?? null,
    ordersToday: ordersTodayRes.count ?? null,
    ordersThisWeek: ordersWeekRes.count ?? null,
    ordersThisMonth: ordersMonthRes.count ?? null,
    activeOrders: activeOrdersRes.count ?? null,
    pendingOrders: pendingOrdersRes.count ?? null,
    completedOrders: completedOrdersRes.count ?? null,
    cancelledOrders: cancelledOrdersRes.count ?? null,
    pendingMerchants: pendingMerchantsRes.count ?? null,
    pendingDrivers: pendingDriversRes.count ?? null,
    activeStores: activeStoresRes.count ?? null,
    inactiveStores: inactiveStoresRes.count ?? null,
    totalGMVMinor: gmv,
    platformCommissionMinor: commission,
    deliveryFeesMinor: deliveryFees,
    driverCommissionsOwedMinor: null,
    totalPayoutsMinor: payouts,
    totalCompletedDeliveries: completedOrdersRes.count ?? null,
    activeDeliveries: activeDeliveriesRes.count ?? null,
  };
}

// ─── Activity Feed ─────────────────────────────────────────────────────────────

export async function getFounderActivityFeed(limit = 20): Promise<ActivityFeedEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFounderActivityFeed error:", error.message);
    return [];
  }
  return (data ?? []) as ActivityFeedEntry[];
}

// ─── Realtime subscriptions ────────────────────────────────────────────────────

export function subscribeToFounderStats(callback: () => void) {
  const channel = supabase
    .channel("founder_control_center")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "stores" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "merchants" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "drivers" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "customers" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "audit_logs" },
      callback
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function getAdminAuditLogs(limit = 60): Promise<AdminAuditLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, admin_user_id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAdminAuditLogs error:", error.message);
    return [];
  }
  return (data ?? []) as AdminAuditLogEntry[];
}

/**
 * Best-effort: record that the founder dashboard was viewed.
 * Uses the SECURITY DEFINER RPC — the server re-verifies the caller's role.
 * Never throws; failure is silently swallowed to avoid blocking the UI.
 */
export async function logFounderDashboardAccess(): Promise<void> {
  try {
    await supabase.rpc("log_admin_audit_event", {
      p_action: "view_founder_dashboard",
      p_entity_type: "system",
    });
  } catch (_) {
    // best-effort only
  }
}
