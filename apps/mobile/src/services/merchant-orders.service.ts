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
    .select(`
      *,
      customer:customers(id, full_name, first_name, last_name),
      address:customer_addresses(address_text, address_line1, address_line2, city, state_province, postal_code, country),
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
        driver:drivers(id, full_name, first_name, last_name, vehicle_type, rating, delivered_count)
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

    // 3. Create Delivery Assignment if order is accepted or ready
    if (newStatus === "accepted" || newStatus === "preparing" || newStatus === "ready_for_pickup") {
      try {
        // Fetch order details to get zone_id and preferred driver_id
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, driver_id, zone_id")
          .eq("id", orderId)
          .single();

        if (orderData) {
          // Check if assignment already exists
          const { data: existingAssignment } = await supabase
            .from("delivery_assignments")
            .select("id")
            .eq("order_id", orderId)
            .single();

          if (!existingAssignment) {
            await supabase.from("delivery_assignments").insert({
              order_id: orderId,
              driver_id: orderData.driver_id || null, // Respect preferred driver if set
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

type MerchantOrdersSubscription = {
  channel: ReturnType<typeof supabase.channel>;
  references: number;
};

const merchantOrdersSubscriptions = new Map<string, MerchantOrdersSubscription>();
let merchantOrdersChannelSequence = 0;

export const subscribeToMerchantOrders = (merchantId: string, callback: () => void) => {
  const existing = merchantOrdersSubscriptions.get(merchantId);
  if (existing) {
    existing.references += 1;
    return createMerchantOrdersCleanup(merchantId, existing);
  }

  // Use a unique topic for each active lifecycle. This prevents a Strict Mode
  // remount from creating a second active channel with the same topic.
  const channelName = `merchant_orders_${merchantId}_${++merchantOrdersChannelSequence}`;
  const channel = supabase.channel(channelName);

  // Every postgres_changes callback must be registered before subscribe().
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "orders" },
    callback,
  );

  const subscription: MerchantOrdersSubscription = { channel, references: 1 };
  merchantOrdersSubscriptions.set(merchantId, subscription);
  channel.subscribe();
  return createMerchantOrdersCleanup(merchantId, subscription);
};

function createMerchantOrdersCleanup(
  merchantId: string,
  subscription: MerchantOrdersSubscription,
): () => Promise<void> {
  return async () => {
    const current = merchantOrdersSubscriptions.get(merchantId);
    if (current !== subscription) return;

    subscription.references -= 1;
    if (subscription.references > 0) return;

    merchantOrdersSubscriptions.delete(merchantId);
    await subscription.channel.unsubscribe();
  };
}

export const getAvailableDriversForOrder = async (orderId: string): Promise<any[]> => {
  const { data, error } = await supabase.rpc("get_available_drivers_for_merchant", {
    p_order_id: orderId
  });

  if (error) {
    console.error("Error fetching available drivers:", error);
    return [];
  }
  return (data || []).map((driver: any) => ({
    ...driver,
    // The RPC contract exposes the primary key as `id`; the UI uses the
    // explicit `driver_id` name to avoid confusing it with the order id.
    driver_id: driver.driver_id || driver.id,
  }));
};

export const assignDriverToOrder = async (orderId: string, driverId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("merchant_assign_driver", {
    p_order_id: orderId,
    p_driver_id: driverId
  });

  if (error) {
    console.error("Error assigning driver:", error);
    return false;
  }
  return !!data;
};
