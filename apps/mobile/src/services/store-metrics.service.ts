import { supabase } from "@/lib/supabase";
import { getPromotionalViews } from "@/services/promotional-views.service";

const METRICS_CACHE_TTL_MS = 60_000;
const metricsCache = new Map<string, { expiresAt: number; value: StoreMetrics }>();

export interface StoreOrderMetrics {
  actualOrderCount: number;
  orderCountOverride: number | null;
  displayedOrderCount: number;
}

export interface StoreMetrics extends StoreOrderMetrics {
  currentViews: number | null;
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export async function getStoreOrderMetrics(storeId: string): Promise<StoreOrderMetrics> {
  if (!storeId) {
    return { actualOrderCount: 0, orderCountOverride: null, displayedOrderCount: 0 };
  }

  const [{ data: orderCount, error: ordersError }, { data: override, error: overrideError }] = await Promise.all([
    supabase.rpc("get_store_order_count", { p_store_id: storeId }),
    supabase
      .from("store_order_count_overrides")
      .select("order_count_override")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  if (ordersError) console.error("getStoreOrderMetrics orders:", ordersError.message);
  if (overrideError) console.error("getStoreOrderMetrics override:", overrideError.message);

  const actualOrderCount = typeof orderCount === "number" && Number.isFinite(orderCount) ? orderCount : 0;
  const orderCountOverride = normalizeNonNegativeInteger(override?.order_count_override);
  return {
    actualOrderCount,
    orderCountOverride,
    displayedOrderCount: orderCountOverride ?? actualOrderCount,
  };
}

export async function getStoreMetrics(storeId: string, entityCreatedAt?: string | null): Promise<StoreMetrics> {
  const cached = metricsCache.get(storeId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [orderMetrics, promotional] = await Promise.all([
    getStoreOrderMetrics(storeId),
    getPromotionalViews("store", storeId, entityCreatedAt),
  ]);
  const value = { ...orderMetrics, currentViews: promotional.currentViews };
  metricsCache.set(storeId, { expiresAt: Date.now() + METRICS_CACHE_TTL_MS, value });
  return value;
}

export async function setStoreOrderCountOverride(
  storeId: string,
  orderCountOverride: number | null,
): Promise<{ error: string | null }> {
  if (!storeId) return { error: "معرف المتجر مطلوب" };
  if (orderCountOverride !== null && normalizeNonNegativeInteger(orderCountOverride) === null) {
    return { error: "عدد الطلبات يجب أن يكون رقماً صحيحاً غير سالب" };
  }

  const { error } = await supabase
    .from("store_order_count_overrides")
    .upsert(
      {
        store_id: storeId,
        order_count_override: orderCountOverride,
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      },
      { onConflict: "store_id" },
    );
  return { error: error?.message ?? null };
}
