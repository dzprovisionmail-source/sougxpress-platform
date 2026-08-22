/**
 * Founder Delivery Operations Service
 * Reads real delivery_assignments and relational data from Supabase using the caller's JWT.
 */

import { supabase } from "@/lib/supabase";

export interface FounderDeliveryAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  driver?: {
    full_name: string;
    phone: string;
    vehicle_type: string | null;
    vehicle_number: string | null;
  } | null;
  order?: {
    id: string;
    status: string;
    order_total_minor: number;
    delivery_fee_minor: number;
    customer?: {
      full_name: string;
      phone: string;
    } | null;
    store?: {
      name: string;
    } | null;
  } | null;
}

export async function getFounderDeliveryAssignments(
  search?: string,
  status?: string,
  limit = 100
): Promise<FounderDeliveryAssignment[]> {
  let q = supabase
    .from("delivery_assignments")
    .select(
      `
      id,
      order_id,
      driver_id,
      status,
      assigned_at,
      picked_up_at,
      delivered_at,
      created_at,
      updated_at,
      driver:drivers(full_name, phone, vehicle_type, vehicle_number),
      order:orders(
        id,
        status,
        order_total_minor,
        delivery_fee_minor,
        customer:customers(first_name, last_name, phone_number, full_name, phone),
        store:stores(name)
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error) {
    console.error("getFounderDeliveryAssignments error:", error.message);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((row) => {
    const driver = row.driver as Record<string, unknown> | null;
    const order = row.order as Record<string, unknown> | null;
    const cust = order?.customer as Record<string, unknown> | null;
    const store = order?.store as Record<string, unknown> | null;

    const customerName =
      cust && "full_name" in cust && cust.full_name
        ? String(cust.full_name)
        : cust
          ? `${String(cust.first_name ?? "")} ${String(cust.last_name ?? "")}`.trim()
          : null;
    const customerPhone =
      cust && "phone" in cust && cust.phone
        ? String(cust.phone)
        : cust
          ? String(cust.phone_number ?? "")
          : "";

    return {
      id: String(row.id),
      order_id: String(row.order_id),
      driver_id: String(row.driver_id),
      status: String(row.status),
      assigned_at: String(row.assigned_at),
      picked_up_at: row.picked_up_at ? String(row.picked_up_at) : null,
      delivered_at: row.delivered_at ? String(row.delivered_at) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      driver: driver
        ? {
            full_name: String(driver.full_name ?? ""),
            phone: String(driver.phone ?? ""),
            vehicle_type: driver.vehicle_type ? String(driver.vehicle_type) : null,
            vehicle_number: driver.vehicle_number ? String(driver.vehicle_number) : null,
          }
        : null,
      order: order
        ? {
            id: String(order.id),
            status: String(order.status),
            order_total_minor: Number(order.order_total_minor ?? 0),
            delivery_fee_minor: Number(order.delivery_fee_minor ?? 0),
            customer: customerName ? { full_name: customerName, phone: customerPhone } : null,
            store: store ? { name: String(store.name ?? "") } : null,
          }
        : null,
    };
  });
}
