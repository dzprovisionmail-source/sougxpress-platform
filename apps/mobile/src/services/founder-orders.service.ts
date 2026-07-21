import { supabase } from "@/lib/supabase";

export interface FounderOrder {
  id: string;
  customer_id: string;
  store_id: string;
  zone_id: string;
  driver_id: string | null;
  status: string;
  subtotal_minor: number;
  delivery_fee_minor: number;
  platform_commission_minor: number;
  total_minor: number;
  delivery_address_id: string;
  placed_at: string;
  delivered_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: { full_name: string; phone: string } | null;
  store?: { name: string; category: string } | null;
  driver?: { full_name: string; phone: string; vehicle_type: string } | null;
}

export interface FounderOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface FounderOrderTimelineEntry {
  id: string;
  order_id: string;
  status: string;
  changed_by: string;
  changed_by_role: string;
  created_at: string;
}

export async function getFounderOrders(
  search?: string,
  status?: string,
  limit = 100
): Promise<FounderOrder[]> {
  let q = supabase
    .from("orders")
    .select("*, customer:customers(full_name,phone), store:stores(name,category), driver:drivers(full_name,phone,vehicle_type)")
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") q = q.eq("status", status);
  if (search?.trim()) q = q.or(`id.ilike.%${search.trim()}%`);

  const { data, error } = await q;
  if (error) console.error("getFounderOrders:", error.message);
  return (data ?? []) as FounderOrder[];
}

export async function getFounderOrder(id: string): Promise<{
  order: FounderOrder | null;
  items: FounderOrderItem[];
  timeline: FounderOrderTimelineEntry[];
  error: string | null;
}> {
  const [orderRes, itemsRes, timelineRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customer:customers(full_name,phone), store:stores(name,category), driver:drivers(full_name,phone,vehicle_type)")
      .eq("id", id)
      .single(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    order: (orderRes.data as FounderOrder) ?? null,
    items: (itemsRes.data ?? []) as FounderOrderItem[],
    timeline: (timelineRes.data ?? []) as FounderOrderTimelineEntry[],
    error: orderRes.error?.message ?? null,
  };
}

export async function updateFounderOrderStatus(
  orderId: string,
  newStatus: string,
  reason?: string
): Promise<{ error: string | null }> {
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "cancelled" && reason) {
    updatePayload.cancelled_reason = reason;
  }
  if (newStatus === "delivered") {
    updatePayload.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (!error) {
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: newStatus,
      changed_by: "",
      changed_by_role: "founder",
    });
  }

  return { error: error?.message ?? null };
}

export async function reassignFounderOrderDriver(
  orderId: string,
  driverId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("orders")
    .update({ driver_id: driverId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  return { error: error?.message ?? null };
}

export async function getFounderDriversForReassignment(): Promise<
  Array<{ id: string; full_name: string; phone: string; vehicle_type: string | null; status: string }>
> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, full_name, phone, vehicle_type, status")
    .in("status", ["active", "offline"])
    .order("full_name");

  if (error) console.error("getFounderDriversForReassignment:", error.message);
  return (data ?? []) as Array<{ id: string; full_name: string; phone: string; vehicle_type: string | null; status: string }>;
}
