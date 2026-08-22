/**
 * Founder Command Center Service
 * Provides read-only global search, operational alerts, and financial snapshot data
 * using existing Supabase client, queries, and RLS rules.
 */
import { supabase } from "@/lib/supabase";

export interface GlobalSearchResult {
  id: string;
  type: "customer" | "merchant" | "store" | "courier" | "order" | "conversation";
  title: string;
  subtitle: string;
  status?: string;
  route: string;
}

export interface OperationalAlert {
  id: string;
  type: "stuck_order" | "pending_approval" | "system_error";
  title: string;
  description: string;
  severity: "warning" | "error" | "info";
  timestamp: string;
}

/**
 * Perform a secure global search across entities accessible to Founder
 */
export async function executeGlobalSearch(searchTerm: string): Promise<GlobalSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  const q = searchTerm.trim().toLowerCase();
  const results: GlobalSearchResult[] = [];

  try {
    // 1. Search Stores
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, is_active")
      .ilike("name", `%${q}%`)
      .limit(5);

    if (stores) {
      for (const s of stores) {
        results.push({
          id: s.id,
          type: "store",
          title: s.name,
          subtitle: `متجر ${s.is_active ? "نشط" : "غير نشط"}`,
          status: s.is_active ? "نشط" : "غير نشط",
          route: "/founder/stores",
        });
      }
    }

    // 2. Search Orders (by ID or status)
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, total_amount_minor, created_at")
      .or(`id.eq.${q},status.ilike.%${q}%`)
      .limit(5);

    if (orders) {
      for (const o of orders) {
        results.push({
          id: o.id,
          type: "order",
          title: `طلب #${o.id.slice(0, 8)}`,
          subtitle: `الحالة: ${o.status} - ${(o.total_amount_minor / 100).toFixed(2)} د.ج`,
          status: o.status,
          route: "/founder/orders",
        });
      }
    }

    // 3. Search Profiles / Users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5);

    if (profiles) {
      for (const p of profiles) {
        const typeTag = p.role === "driver" ? "courier" : p.role === "merchant" ? "merchant" : "customer";
        results.push({
          id: p.id,
          type: typeTag as any,
          title: p.full_name || "مستخدم بدون اسم",
          subtitle: `دور: ${p.role} | هاتف: ${p.phone || "غير متوفر"}`,
          status: p.role,
          route: typeTag === "courier" ? "/founder/couriers-control" : typeTag === "merchant" ? "/founder/merchants-control" : "/founder/customers-control",
        });
      }
    }
  } catch (err) {
    console.error("Global search error:", err);
  }

  return results;
}

/**
 * Fetch verifiable operational alerts based on real data
 */
export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const alerts: OperationalAlert[] = [];

  try {
    // 1. Check pending merchants/drivers needing approval
    const { count: pendingMerchants } = await supabase
      .from("merchants")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending");

    if (pendingMerchants && pendingMerchants > 0) {
      alerts.push({
        id: "pending-merchants",
        type: "pending_approval",
        title: "تجار بانتظار الموافقة",
        description: `يوجد ${pendingMerchants} تاجر بانتظار الاعتماد والمراجعة.`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      });
    }

    const { count: pendingDrivers } = await supabase
      .from("drivers")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (pendingDrivers && pendingDrivers > 0) {
      alerts.push({
        id: "pending-drivers",
        type: "pending_approval",
        title: "موصلون بانتظار الموافقة",
        description: `يوجد ${pendingDrivers} موصل بانتظار الاعتماد والمراجعة.`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Check stuck or pending orders older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: stuckOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", oneDayAgo);

    if (stuckOrders && stuckOrders > 0) {
      alerts.push({
        id: "stuck-orders",
        type: "stuck_order",
        title: "طلبات معلقة لفترة طويلة",
        description: `يوجد ${stuckOrders} طلب في حالة انتظار لأكثر من 24 ساعة.`,
        severity: "error",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Operational alerts error:", err);
  }

  return alerts;
}
