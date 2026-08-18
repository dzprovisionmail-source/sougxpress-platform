import { supabase } from "../lib/supabase";
import { Order, OrderStatus } from "../types/schema-03-core";
import { subscribeToTableChanges } from "../lib/realtime-registry";

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
        store:stores (id, name, merchant_id, zone:zones (city)),
        address:customer_addresses (address_text, latitude, longitude),
        customer:customers (id, full_name, phone)
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
        store:stores (id, name, merchant_id, zone:zones (city)),
        address:customer_addresses (address_text, latitude, longitude),
        customer:customers (id, full_name, phone)
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
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("is_suspended_for_debt, delivery_count, commission_paid_through_count")
      .eq("id", driverId)
      .maybeSingle();

    if (driverError) throw driverError;
    const unpaidDeliveryCount = Math.max(
      (driver?.delivery_count ?? 0) - (driver?.commission_paid_through_count ?? 0),
      0
    );
    if (driver?.is_suspended_for_debt || unpaidDeliveryCount >= 50) {
      console.warn("Courier commission payment required before accepting deliveries");
      return false;
    }

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
  return subscribeToTableChanges(
    `driver_assignments_${driverId}`,
    "delivery_assignments",
    `driver_id=eq.${driverId}`,
    callback
  );
};

export const subscribeToAvailableOrders = (callback: () => void) => {
  return subscribeToTableChanges(
    "available_assignments",
    "delivery_assignments",
    "driver_id=is.null",
    callback
  );
};
