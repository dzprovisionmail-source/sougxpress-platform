import { supabase } from "../lib/supabase";
import { Order, OrderStatus } from "../types/schema-03-core";

export const getMerchantOrders = async (merchantId: string): Promise<Order[]> => {
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("merchant_id", merchantId);

  if (!stores || stores.length === 0) return [];

  const storeIds = stores.map(s => s.id);

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(id, full_name),
      address:customer_addresses(address_text),
      items:order_items(
        id,
        quantity,
        price_at_order_minor,
        line_total_minor,
        product:products(id, name, image_url)
      ),
      delivery_assignments(
        id,
        status,
        driver_id,
        driver:drivers(id, first_name, last_name, vehicle_type, rating)
      )
    `)
    .in("store_id", storeIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching merchant orders:", error);
    return [];
  }
  return data as any[];
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  merchantId: string
): Promise<boolean> => {
  try {
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (orderError) throw orderError;

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: newStatus,
        changed_by: merchantId,
        changed_by_role: "merchant",
      });

    if (historyError) throw historyError;

    if (newStatus === "accepted" || newStatus === "preparing" || newStatus === "ready_for_pickup") {
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, driver_id, zone_id")
          .eq("id", orderId)
          .single();

        if (orderData) {
          const { data: existingAssignment } = await supabase
            .from("delivery_assignments")
            .select("id")
            .eq("order_id", orderId)
            .single();

          if (!existingAssignment) {
            await supabase.from("delivery_assignments").insert({
              order_id: orderId,
              driver_id: orderData.driver_id || null,
              status: "pending",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (assignErr) {
        console.warn("Failed to create delivery assignment:", assignErr);
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    return false;
  }
};

export const subscribeToMerchantOrders = (merchantId: string, callback: () => void) => {
  const channel = supabase.channel(`merchant_orders_${merchantId}`);
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "orders" },
    callback
  );
  channel.subscribe();
  return channel;
};

export const getAvailableDriversForOrder = async (orderId: string): Promise<any[]> => {
  const { data, error } = await supabase.rpc("get_available_drivers_for_merchant", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("Error fetching available drivers:", error);
    return [];
  }
  return data || [];
};

export const assignDriverToOrder = async (orderId: string, driverId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("merchant_assign_driver", {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    console.error("Error assigning driver:", error);
    return false;
  }
  return !!data;
};

export interface CommercialStats {
  customer_purchases_completed: number;
  customer_deliveries_completed: number;
  merchant_orders_completed: number;
  merchant_sales_completed_minor: number;
  driver_deliveries_completed: number;
  driver_delivery_gross_minor: number;
  driver_commission_owed_minor: number;
  driver_net_minor: number;
}

export const getMyCommercialStats = async (): Promise<CommercialStats | null> => {
  const { data, error } = await supabase.rpc("get_my_commercial_stats");
  if (error) {
    console.error("Error fetching commercial stats:", error);
    return null;
  }
  return (data?.[0] ?? null) as CommercialStats | null;
};
