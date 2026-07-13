
import { createOrder, createOrderItems, createOrderStatusHistory } from "./order.service";
import { Order, OrderItem, OrderStatusHistory } from "../types/schema-03-core";
import { CartItem } from "./cart.service";

export interface CheckoutData {
  customer_id: string;
  store_id: string;
  zone_id: string;
  delivery_address_id: string;
  subtotal_minor: number;
  delivery_fee_minor: number;
  platform_commission_minor: number;
  total_minor: number;
  notes: string;
  cartItems: CartItem[];
}

export const processCheckout = async (data: CheckoutData): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    // 1. Create the Order
    const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
      customer_id: data.customer_id,
      store_id: data.store_id,
      zone_id: data.zone_id,
      driver_id: null,
      status: "pending",
      subtotal_minor: data.subtotal_minor,
      delivery_fee_minor: data.delivery_fee_minor,
      platform_commission_minor: data.platform_commission_minor,
      total_minor: data.total_minor,
      delivery_address_id: data.delivery_address_id,
      placed_at: new Date().toISOString(),
      delivered_at: null,
      cancelled_reason: null,
      // Add notes if available in schema, otherwise handle separately
    };

    const newOrder = await createOrder(orderData);
    if (!newOrder) throw new Error("Failed to create order");

    // 2. Create Order Items
    const orderItems: Omit<OrderItem, 'id'>[] = data.cartItems.map(item => ({
      order_id: newOrder.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price_minor: item.product.price_minor,
      line_total_minor: item.product.price_minor * item.quantity,
    }));

    const createdItems = await createOrderItems(orderItems);
    if (!createdItems) throw new Error("Failed to create order items");

    // 3. Create Order Status History
    const statusHistory: Omit<OrderStatusHistory, 'id' | 'created_at'> = {
      order_id: newOrder.id,
      status: "pending",
      changed_by: data.customer_id,
      changed_by_role: "customer",
    };

    const createdHistory = await createOrderStatusHistory(statusHistory);
    if (!createdHistory) throw new Error("Failed to create order status history");

    return { success: true, orderId: newOrder.id };
  } catch (error: any) {
    console.error("Checkout process failed:", error);
    return { success: false, error: error.message };
  }
};
