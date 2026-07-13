
import { supabase } from "../lib/supabase";
import { Order, OrderItem, OrderStatus, OrderStatusHistory } from "../types/schema-03-core";

export const getMerchantOrders = async (merchantId: string): Promise<Order[]> => {
  // First get store IDs for this merchant
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("merchant_id", merchantId);

  if (!stores || stores.length === 0) return [];

  const storeIds = stores.map(s => s.id);

  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customers(full_name), address:customer_addresses(address_text)")
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
    // 1. Update Order Status
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (orderError) throw orderError;

    // 2. Add to Status History
    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: newStatus,
        changed_by: merchantId,
        changed_by_role: "merchant",
      });

    if (historyError) throw historyError;

    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    return false;
  }
};

export const subscribeToMerchantOrders = (merchantId: string, callback: () => void) => {
  return supabase
    .channel(`merchant_orders_${merchantId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      callback
    )
    .subscribe();
};
