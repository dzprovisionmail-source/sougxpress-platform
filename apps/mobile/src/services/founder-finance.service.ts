import { supabase } from "@/lib/supabase";

export interface FounderPayout {
  id: string;
  recipient_type: string;
  recipient_id: string;
  amount_minor: number;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export interface FounderTransaction {
  id: string;
  order_id: string | null;
  type: string;
  amount_minor: number;
  created_at: string;
}

export async function getFounderPayouts(
  recipientType?: string,
  status?: string,
  limit = 100
): Promise<FounderPayout[]> {
  let q = supabase
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (recipientType && recipientType !== "all") q = q.eq("recipient_type", recipientType);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) console.error("getFounderPayouts:", error.message);
  return (data ?? []) as FounderPayout[];
}

export async function getFounderTransactions(limit = 100): Promise<FounderTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) console.error("getFounderTransactions:", error.message);
  return (data ?? []) as FounderTransaction[];
}

export async function getFounderFinanceSummary(): Promise<{
  totalGMVMinor: number | null;
  totalCommissionMinor: number | null;
  totalDeliveryFeesMinor: number | null;
  totalPayoutsMinor: number | null;
  pendingPayoutsMinor: number | null;
  totalOrders: number | null;
  error: string | null;
}> {
  const [
    gmvRes,
    commissionRes,
    deliveryRes,
    payoutsRes,
    pendingPayoutsRes,
    ordersRes,
  ] = await Promise.all([
    supabase.from("orders").select("total_minor").eq("status", "delivered"),
    supabase.from("orders").select("platform_commission_minor").eq("status", "delivered"),
    supabase.from("orders").select("delivery_fee_minor").eq("status", "delivered"),
    supabase.from("payouts").select("amount_minor").eq("status", "paid"),
    supabase.from("payouts").select("amount_minor").eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  if (gmvRes.error) return { totalGMVMinor: null, totalCommissionMinor: null, totalDeliveryFeesMinor: null, totalPayoutsMinor: null, pendingPayoutsMinor: null, totalOrders: null, error: gmvRes.error.message };

  const sumMinor = (rows: Array<{ [key: string]: number | null }> | undefined, field: string): number =>
    (rows ?? []).reduce((sum, row) => sum + (row[field] ?? 0), 0);

  return {
    totalGMVMinor: sumMinor(gmvRes.data as any, "total_minor"),
    totalCommissionMinor: sumMinor(commissionRes.data as any, "platform_commission_minor"),
    totalDeliveryFeesMinor: sumMinor(deliveryRes.data as any, "delivery_fee_minor"),
    totalPayoutsMinor: sumMinor(payoutsRes.data as any, "amount_minor"),
    pendingPayoutsMinor: sumMinor(pendingPayoutsRes.data as any, "amount_minor"),
    totalOrders: ordersRes.count ?? null,
    error: null,
  };
}
