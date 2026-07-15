
import { supabase } from "../lib/supabase";
import { Order, OrderStatus } from "../types/schema-03-core";

/**
 * Orders currently assigned to this driver (accepted through delivered),
 * mirroring the read pattern used by merchant-orders.service.ts.
 */
const ORDER_SELECT_WITH_LOCATIONS =
  "*, store:stores(name, zone:zones(city)), address:customer_addresses(address_text, latitude, longitude)";

export const getDriverOrders = async (driverId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_WITH_LOCATIONS)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching driver orders:", error);
    return [];
  }
  return data as any[];
};

/**
 * Orders ready for pickup in the driver's zone that have not yet been
 * claimed by another driver — the "available deliveries" pool.
 */
export const getAvailableOrders = async (zoneId: string): Promise<Order[]> => {
  if (!zoneId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_WITH_LOCATIONS)
    .eq("zone_id", zoneId)
    .eq("status", "ready_for_pickup")
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching available orders:", error);
    return [];
  }
  return data as any[];
};

export const acceptOrder = async (orderId: string, driverId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ driver_id: driverId, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("driver_id", null);

    if (error) throw error;

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: "ready_for_pickup",
        changed_by: driverId,
        changed_by_role: "driver",
      });

    if (historyError) throw historyError;

    return true;
  } catch (error) {
    console.error("Error accepting order:", error);
    return false;
  }
};

export const updateDeliveryStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  driverId: string
): Promise<boolean> => {
  try {
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    const { error: orderError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (orderError) throw orderError;

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: newStatus,
        changed_by: driverId,
        changed_by_role: "driver",
      });

    if (historyError) throw historyError;

    return true;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return false;
  }
};

export const subscribeToDriverOrders = (driverId: string, callback: () => void) => {
  return supabase
    .channel(`driver_orders_${driverId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      callback
    )
    .subscribe();
};
