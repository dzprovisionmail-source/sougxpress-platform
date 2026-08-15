import { createOrder, createOrderItems, createOrderStatusHistory } from "./order.service";
import { Order, OrderItem, OrderStatusHistory } from "../types/schema-03-core";
import { CartItem } from "./cart.service";
import { supabase } from "../lib/supabase";

export interface CheckoutData {
  customer_id: string;
  store_id: string;
  zone_id: string;
  delivery_address_id: string;
  subtotal_minor: number;
  delivery_fee_minor: number;
  platform_commission_minor: number;
  total_minor: number;
  notes?: string;
  driver_id?: string | null;
  cartItems: CartItem[];
}

export const processCheckout = async (data: CheckoutData): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    // 1. Ensure authoritative totals are computed securely from cart items
    const computedSubtotal = data.cartItems.reduce((acc, item) => acc + (item.product.price_minor * item.quantity), 0);
    const deliveryFee = typeof data.delivery_fee_minor === 'number' ? data.delivery_fee_minor : 0;
    const platformCommission = typeof data.platform_commission_minor === 'number' 
      ? data.platform_commission_minor 
      : Math.round(computedSubtotal * 0.1);
    const computedTotal = computedSubtotal + deliveryFee;

    if (computedTotal <= 0 || computedSubtotal <= 0) {
      throw new Error("مجموع الطلب غير صالح أو السلة فارغة.");
    }

    // 2. Prepare order record with both legacy authoritative fields and newer aligned fields
    const orderPayload: any = {
      customer_id: data.customer_id,
      store_id: data.store_id,
      zone_id: data.zone_id,
      driver_id: data.driver_id || null,
      status: "pending",
      order_total_minor: computedTotal, // Required by original schema NOT NULL constraint
      subtotal_minor: computedSubtotal,
      delivery_fee_minor: deliveryFee,
      platform_commission_minor: platformCommission,
      total_minor: computedTotal,
      delivery_address_id: data.delivery_address_id,
      special_instructions: data.notes || null,
      delivered_at: null,
      cancelled_reason: null,
    };

    const newOrder = await createOrder(orderPayload);
    if (!newOrder) throw new Error("فشل في إنشاء الطلب في قاعدة البيانات.");

    // 3. Create Order Items with both unit_price_minor and price_at_order_minor
    const orderItems: any[] = data.cartItems.map(item => ({
      order_id: newOrder.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price_minor: item.product.price_minor,
      price_at_order_minor: item.product.price_minor, // Required by original schema NOT NULL constraint
      line_total_minor: item.product.price_minor * item.quantity,
    }));

    const createdItems = await createOrderItems(orderItems);
    if (!createdItems) throw new Error("فشل في حفظ عناصر الطلب.");

    // 4. Create Order Status History
    const statusHistory: Omit<OrderStatusHistory, 'id' | 'created_at'> = {
      order_id: newOrder.id,
      status: "pending",
      changed_by: data.customer_id,
      changed_by_role: "customer",
    };

    const createdHistory = await createOrderStatusHistory(statusHistory);
    if (!createdHistory) throw new Error("فشل في تسجيل حالة الطلب الأولية.");

    // 5. If a preferred driver (driver_id) was selected, ensure a delivery assignment is linked or created if RLS / permissions allow
    if (data.driver_id) {
      try {
        await supabase.from("delivery_assignments").insert({
          order_id: newOrder.id,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (assignErr) {
        console.warn("Could not insert delivery assignment directly (may require founder/admin RLS or trigger):", assignErr);
      }
    }

    return { success: true, orderId: newOrder.id };
  } catch (error: any) {
    console.error("Checkout process failed:", error);
    return { success: false, error: error.message || "حدث خطأ غير معروف أثناء إتمام الطلب." };
  }
};
