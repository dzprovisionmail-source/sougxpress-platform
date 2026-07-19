import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

/**
 * Founder User Management Service
 * All write operations use the caller's JWT (admin/founder role).
 * Audit logging via SECURITY DEFINER RPC — never exposes service_role.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FounderCustomer {
  id:             string;
  full_name:      string;
  phone:          string;
  email:          string;
  status:         string;
  zone_id:        string | null;
  address:        string | null;
  is_gold_member: boolean;
  avatar_url:     string | null;
  deleted_at:     string | null;
  admin_notes:    string | null;
  city:           string | null;
  neighborhood:   string | null;
  created_at:     string;
  updated_at:     string;
}

export interface FounderMerchant {
  id:              string;
  owner_full_name: string;
  business_name:   string;
  phone:           string;
  email:           string;
  status:          string;
  zone_id:         string | null;
  address:         string | null;
  description:     string | null;
  logo_url:        string | null;
  commission_rate: number;
  deleted_at:      string | null;
  admin_notes:     string | null;
  created_at:      string;
  updated_at:      string;
}

export interface FounderDriver {
  id:              string;
  full_name:       string;
  phone:           string;
  email:           string;
  status:          string;
  availability:    string;
  zone_id:         string | null;
  address:         string | null;
  vehicle_type:    string | null;
  vehicle_number:  string | null;
  delivered_count: number;
  rating:          number;
  deleted_at:      string | null;
  admin_notes:     string | null;
  created_at:      string;
  updated_at:      string;
}

export interface FounderZone {
  id:   string;
  name: string;
  city: string;
}

export interface CustomerAddress {
  id:            string;
  address_line1: string;
  address_line2: string | null;
  city:          string;
  label:         string | null;
  is_default:    boolean;
  created_at:    string;
}

export interface CommissionCycle {
  id:                    string;
  status:                string;
  deliveries_count:      number;
  commission_earned_minor: number;
  cycle_start_date:      string;
  payment_due_at:        string | null;
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function audit(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc("log_admin_audit_event", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId ?? null,
      p_details: details ? JSON.stringify(details) : null,
    });
  } catch (_) {
    // best-effort
  }
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export async function getFounderZones(): Promise<FounderZone[]> {
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, city")
    .order("name");
  if (error) console.error("getFounderZones:", error.message);
  return (data ?? []) as FounderZone[];
}

// ─── Customers ────────────────────────────────────────────────────────────────

const CUSTOMER_COLS =
  "id,full_name,phone,email,status,zone_id,address,is_gold_member,avatar_url,deleted_at,admin_notes,city,neighborhood,created_at,updated_at";

export async function getFounderCustomers(
  search?: string,
  status?: string,
  includeDeleted = false
): Promise<FounderCustomer[]> {
  let q = supabase
    .from("customers")
    .select(CUSTOMER_COLS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeDeleted) q = q.is("deleted_at", null);
  if (status && status !== "all") q = q.eq("status", status);
  if (search?.trim()) q = q.ilike("full_name", `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) console.error("getFounderCustomers:", error.message);
  return (data ?? []) as FounderCustomer[];
}

export async function getFounderCustomer(id: string): Promise<{
  customer: FounderCustomer | null;
  addresses: CustomerAddress[];
  ordersCount: number;
  error: string | null;
}> {
  const [customerRes, addressesRes, ordersRes] = await Promise.all([
    supabase.from("customers").select(CUSTOMER_COLS).eq("id", id).single(),
    supabase
      .from("customer_addresses")
      .select("id,address_line1,address_line2,city,label,is_default,created_at")
      .eq("customer_id", id)
      .order("is_default", { ascending: false }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id),
  ]);

  return {
    customer: (customerRes.data as FounderCustomer) ?? null,
    addresses: (addressesRes.data ?? []) as CustomerAddress[],
    ordersCount: ordersRes.count ?? 0,
    error: customerRes.error?.message ?? null,
  };
}

export async function updateFounderCustomer(
  id: string,
  data: Partial<FounderCustomer>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("customers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_customer", "customer", id, data as Record<string, unknown>);
  return { error: error?.message ?? null };
}

export async function setFounderCustomerStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("customers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_customer_status", "customer", id, { status });
  return { error: error?.message ?? null };
}

export async function softDeleteFounderCustomer(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: now, status: "suspended", updated_at: now })
    .eq("id", id);
  if (!error) await audit("soft_delete_customer", "customer", id);
  return { error: error?.message ?? null };
}

// ─── Merchants ────────────────────────────────────────────────────────────────

const MERCHANT_COLS =
  "id,owner_full_name,business_name,phone,email,status,zone_id,address,description,logo_url,commission_rate,deleted_at,admin_notes,created_at,updated_at";

export async function getFounderMerchants(
  search?: string,
  status?: string,
  includeDeleted = false
): Promise<FounderMerchant[]> {
  let q = supabase
    .from("merchants")
    .select(MERCHANT_COLS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeDeleted) q = q.is("deleted_at", null);
  if (status && status !== "all") q = q.eq("status", status);
  if (search?.trim()) q = q.ilike("business_name", `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) console.error("getFounderMerchants:", error.message);
  return (data ?? []) as FounderMerchant[];
}

export async function getFounderMerchant(id: string): Promise<{
  merchant: FounderMerchant | null;
  stores: Record<string, unknown>[];
  ordersCount: number;
  error: string | null;
}> {
  const [merchantRes, storesRes, ordersRes] = await Promise.all([
    supabase.from("merchants").select(MERCHANT_COLS).eq("id", id).single(),
    supabase
      .from("stores")
      .select("id,name,status,category,created_at")
      .eq("merchant_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in(
        "store_id",
        (await supabase.from("stores").select("id").eq("merchant_id", id)).data?.map(
          (s: { id: string }) => s.id
        ) ?? []
      ),
  ]);

  return {
    merchant: (merchantRes.data as FounderMerchant) ?? null,
    stores: (storesRes.data ?? []) as Record<string, unknown>[],
    ordersCount: ordersRes.count ?? 0,
    error: merchantRes.error?.message ?? null,
  };
}

export async function updateFounderMerchant(
  id: string,
  data: Partial<FounderMerchant>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("merchants")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_merchant", "merchant", id, data as Record<string, unknown>);
  return { error: error?.message ?? null };
}

export async function setFounderMerchantStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("merchants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_merchant_status", "merchant", id, { status });
  return { error: error?.message ?? null };
}

export async function softDeleteFounderMerchant(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("merchants")
    .update({ deleted_at: now, status: "suspended", updated_at: now })
    .eq("id", id);
  if (!error) await audit("soft_delete_merchant", "merchant", id);
  return { error: error?.message ?? null };
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

const DRIVER_COLS =
  "id,full_name,phone,email,status,availability,zone_id,address,vehicle_type,vehicle_number,delivered_count,rating,deleted_at,admin_notes,created_at,updated_at";

export async function getFounderDrivers(
  search?: string,
  status?: string,
  includeDeleted = false
): Promise<FounderDriver[]> {
  let q = supabase
    .from("drivers")
    .select(DRIVER_COLS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeDeleted) q = q.is("deleted_at", null);
  if (status && status !== "all") q = q.eq("status", status);
  if (search?.trim()) q = q.ilike("full_name", `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) console.error("getFounderDrivers:", error.message);
  return (data ?? []) as FounderDriver[];
}

export async function getFounderDriver(id: string): Promise<{
  driver: FounderDriver | null;
  deliveriesCount: number;
  activeCommissionCycle: CommissionCycle | null;
  totalOwedMinor: number;
  error: string | null;
}> {
  const [driverRes, cyclesRes] = await Promise.all([
    supabase.from("drivers").select(DRIVER_COLS).eq("id", id).single(),
    supabase
      .from("delivery_commission_cycles")
      .select(
        "id,status,deliveries_count,commission_earned_minor,cycle_start_date,payment_due_at"
      )
      .eq("driver_id", id)
      .order("cycle_start_date", { ascending: false })
      .limit(10),
  ]);

  const cycles = (cyclesRes.data ?? []) as CommissionCycle[];
  const activeOrDueCycle =
    cycles.find((c) => c.status === "payment_due") ??
    cycles.find((c) => c.status === "active") ??
    null;
  const totalOwed = cycles
    .filter((c) => c.status === "payment_due")
    .reduce((sum, c) => sum + (c.commission_earned_minor ?? 0), 0);

  return {
    driver: (driverRes.data as FounderDriver) ?? null,
    deliveriesCount: (driverRes.data as FounderDriver)?.delivered_count ?? 0,
    activeCommissionCycle: activeOrDueCycle,
    totalOwedMinor: totalOwed,
    error: driverRes.error?.message ?? null,
  };
}

export async function updateFounderDriver(
  id: string,
  data: Partial<FounderDriver>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("drivers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_driver", "driver", id, data as Record<string, unknown>);
  return { error: error?.message ?? null };
}

export async function setFounderDriverStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("drivers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) await audit("update_driver_status", "driver", id, { status });
  return { error: error?.message ?? null };
}

export async function softDeleteFounderDriver(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("drivers")
    .update({ deleted_at: now, status: "suspended", updated_at: now })
    .eq("id", id);
  if (!error) await audit("soft_delete_driver", "driver", id);
  return { error: error?.message ?? null };
}

// ─── Password reset (via Edge Function) ──────────────────────────────────────

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("admin-reset-password", {
    body: { user_id: userId, new_password: newPassword },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  await audit("reset_password", "user", userId);
  return { error: null };
}

// ─── Avatar / logo upload ─────────────────────────────────────────────────────

export async function pickAndUploadAvatar(
  entityId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { url: null, error: "يجب السماح بالوصول إلى معرض الصور" };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { url: null, error: null }; // user cancelled
    }

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${entityId}/avatar.${ext}`;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return { url: urlData.publicUrl ?? null, error: null };
  } catch (e) {
    return { url: null, error: (e as Error).message };
  }
}
