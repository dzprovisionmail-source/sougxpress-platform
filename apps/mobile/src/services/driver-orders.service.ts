import { supabase } from "../lib/supabase";
import { Order, OrderStatus } from "../types/schema-03-core";

/**
 * Assignments currently for this driver.
 */
export const getDriverOrders = async (driverId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from("delivery_assignments")
    .select(`
      *,
      order:orders (
        *,
        store:stores (name, zone:zones (city)),
        address:customer_addresses (address_text, latitude, longitude)
      )
    `)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching driver orders:", error);
    return [];
  }
  return (data as any[] ?? []).map(a => ({
    ...a.order,
    assignment_id: a.id,
    assignment_status: a.status
  }));
};

/**
 * Available delivery assignments in the driver's zone.
 */
export const getAvailableOrders = async (zoneId: string): Promise<any[]> => {
  if (!zoneId) return [];

  const { data, error } = await supabase
    .from("delivery_assignments")
    .select(`
      *,
      order:orders (
        *,
        store:stores (name, zone:zones (city)),
        address:customer_addresses (address_text, latitude, longitude)
      )
    `)
    .eq("status", "pending")
    .is("driver_id", null)
    .eq("order.zone_id", zoneId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching available orders:", error);
    return [];
  }
  return (data as any[] ?? []).map(a => ({
    ...a.order,
    assignment_id: a.id,
    assignment_status: a.status
  }));
};

export const acceptOrder = async (assignmentId: string, driverId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("delivery_assignments")
      .update({ 
        driver_id: driverId, 
        status: "accepted",
        assigned_at: new Date().toISOString() 
      })
      .eq("id", assignmentId)
      .is("driver_id", null);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error accepting order:", error);
    return false;
  }
};

export const updateDeliveryStatus = async (
  assignmentId: string,
  newStatus: string,
  driverId: string
): Promise<boolean> => {
  try {
    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "delivered") {
      updates.delivered_at = new Date().toISOString();
    } else if (newStatus === "picked_up") {
      updates.picked_up_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("delivery_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .eq("driver_id", driverId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return false;
  }
};

export const subscribeToDriverOrders = (driverId: string, callback: () => void) => {
  return supabase
    .channel(`driver_assignments_${driverId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "delivery_assignments", filter: `driver_id=eq.${driverId}` },
      callback
    )
    .subscribe();
};
