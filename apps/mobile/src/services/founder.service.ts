import { supabase } from "@/lib/supabase";

/**
 * Founder service — live Supabase statistics and audit log.
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

export interface AdminAuditLogEntry {
  id:             string;
  admin_user_id:  string;
  action:         string;
  entity_type:    string;
  entity_id:      string | null;
  details:        Record<string, unknown> | null;
  created_at:     string;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

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

  // Sum suspended accounts across all entity types
  const suspendedTotal =
    (suspCustomersRes.count ?? 0) +
    (suspMerchantsRes.count ?? 0) +
    (suspDriversRes.count ?? 0);

  // Sum driver commissions owed (minor units)
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
