import { supabase } from "@/lib/supabase";

/**
 * Admin service — read queries + secure write operations.
 * Write operations use the calling user's JWT; no service_role in the mobile bundle.
 * Account creation is delegated to the admin-provision-account Edge Function.
 */

// ─── Dashboard ───────────────────────────────────────────────────────────────

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

// ─── List queries ─────────────────────────────────────────────────────────────

export interface AdminListResult<T> {
  data: T[];
  error: string | null;
}

export async function getAdminStores(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("stores")
    .select("id, name, category, status, zone_id, merchant_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminMerchants(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("merchants")
    .select("id, business_name, owner_full_name, phone, email, status, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) query = query.ilike("business_name", `%${search}%`);

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminDrivers(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("drivers")
    .select("id, full_name, phone, email, status, vehicle_type, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) query = query.ilike("full_name", `%${search}%`);

  const { data, error } = await query;
  return { data: (data ?? []) as Record<string, unknown>[], error: error?.message ?? null };
}

export async function getAdminCustomers(
  search?: string
): Promise<AdminListResult<Record<string, unknown>>> {
  let query = supabase
    .from("customers")
    .select("id, full_name, phone, email, status, is_gold_member, zone_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) query = query.ilike("full_name", `%${search}%`);

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

  if (search) query = query.ilike("id", `%${search}%`);

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

  if (search) query = query.ilike("name", `%${search}%`);

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

// Lightweight merchant picker for store creation form
export async function getAdminMerchantsForPicker(): Promise<{
  data: Array<{ id: string; business_name: string }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("merchants")
    .select("id, business_name")
    .in("status", ["active", "pending_review"])
    .order("business_name")
    .limit(100);
  return {
    data: (data ?? []) as Array<{ id: string; business_name: string }>,
    error: error?.message ?? null,
  };
}

// ─── Store creation (direct insert, no Auth account needed) ──────────────────

export interface CreateStoreParams {
  name: string;
  category: string;
  zone_id?: string;
  address?: string;
  phone?: string;
  description?: string;
  opening_hours?: string;
  status: string;
  is_new?: boolean;
  is_featured?: boolean;
  show_on_home?: boolean;
  merchant_id?: string;
}

export async function createAdminStore(
  params: CreateStoreParams
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const payload: Record<string, unknown> = {
    name: params.name.trim(),
    category: params.category.trim(),
    status: params.status,
    is_new: params.is_new ?? false,
    is_featured: params.is_featured ?? false,
    show_on_home: params.show_on_home ?? false,
  };

  if (params.zone_id) payload.zone_id = params.zone_id;
  if (params.address?.trim()) payload.address = params.address.trim();
  if (params.phone?.trim()) payload.phone = params.phone.trim();
  if (params.description?.trim()) payload.description = params.description.trim();
  if (params.opening_hours?.trim()) payload.opening_hours = params.opening_hours.trim();
  if (params.merchant_id?.trim()) payload.merchant_id = params.merchant_id.trim();

  const { data, error } = await supabase
    .from("stores")
    .insert(payload)
    .select("id, name, status")
    .single();

  await writeAdminAuditLog(
    error ? "create_store_failed" : "create_store",
    "store",
    data ? String(data["id"] ?? "") : null,
    { name: params.name, error: error?.message }
  );

  return {
    data: data as Record<string, unknown> | null,
    error: error?.message ?? null,
  };
}

// ─── Account provisioning via Edge Function ───────────────────────────────────

export interface ProvisionAccountParams {
  role: "merchant" | "driver" | "customer";
  full_name: string;
  phone: string;
  email: string;
  password: string;
  zone_id?: string;
  address?: string;
  status?: string;
  business_name?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_gold_member?: boolean;
}

export async function adminProvisionAccount(
  params: ProvisionAccountParams
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(
    "admin-provision-account",
    { body: params }
  );

  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: data.error as string };
  return { data: data as Record<string, unknown>, error: null };
}

// ─── Status updates ───────────────────────────────────────────────────────────

export async function updateAdminStoreStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("stores").update({ status }).eq("id", id);
  if (!error) await writeAdminAuditLog("update_store_status", "store", id, { status });
  return { error: error?.message ?? null };
}

export async function updateAdminMerchantStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("merchants").update({ status }).eq("id", id);
  if (!error) await writeAdminAuditLog("update_merchant_status", "merchant", id, { status });
  return { error: error?.message ?? null };
}

export async function updateAdminDriverStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("drivers").update({ status }).eq("id", id);
  if (!error) await writeAdminAuditLog("update_driver_status", "driver", id, { status });
  return { error: error?.message ?? null };
}

export async function updateAdminCustomerStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("customers").update({ status }).eq("id", id);
  if (!error) await writeAdminAuditLog("update_customer_status", "customer", id, { status });
  return { error: error?.message ?? null };
}

// ─── Internal audit helper (best-effort, never throws) ───────────────────────

async function writeAdminAuditLog(
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("audit_logs").insert({
      actor_id: session.user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (_) {
    // best-effort
  }
}
