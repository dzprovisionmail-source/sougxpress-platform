import { supabase } from "@/lib/supabase";

/**
 * Admin service — read-only queries against existing tables.
 * All functions return null / empty array on error instead of throwing.
 * No writes, no schema changes, no service_role usage.
 */

export interface AdminDashboardStats {
  customersCount: number | null;
  merchantsCount: number | null;
  driversCount: number | null;
  storesCount: number | null;
  ordersToday: number | null;
  ordersPending: number | null;
  ordersInDelivery: number | null;
  ordersCompleted: number | null;
  pendingApprovals: number | null;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    customersRes,
    merchantsRes,
    driversRes,
    storesRes,
    ordersTodayRes,
    ordersPendingRes,
    ordersInDeliveryRes,
    ordersCompletedRes,
    pendingApprovalsRes,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["accepted", "preparing", "ready_for_pickup", "picked_up"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    supabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  return {
    customersCount: customersRes.count ?? null,
    merchantsCount: merchantsRes.count ?? null,
    driversCount: driversRes.count ?? null,
    storesCount: storesRes.count ?? null,
    ordersToday: ordersTodayRes.count ?? null,
    ordersPending: ordersPendingRes.count ?? null,
    ordersInDelivery: ordersInDeliveryRes.count ?? null,
    ordersCompleted: ordersCompletedRes.count ?? null,
    pendingApprovals: pendingApprovalsRes.count ?? null,
  };
}

export interface AdminListResult<T> {
  data: T[];
  error: string | null;
}

export async function getAdminStores(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("stores")
    .select("id, name, category, status, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminMerchants(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("merchants")
    .select("id, business_name, owner_full_name, phone, status, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("business_name", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminDrivers(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("drivers")
    .select("id, full_name, phone, status, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminCustomers(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("customers")
    .select("id, full_name, phone, status, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminOrders(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("orders")
    .select("id, status, total_minor, created_at, customer_id, store_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("id", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminProducts(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("products")
    .select("id, name, status, price_minor, store_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminZones(): Promise<AdminListResult<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, city, status, created_at")
    .order("created_at", { ascending: false });

  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}
