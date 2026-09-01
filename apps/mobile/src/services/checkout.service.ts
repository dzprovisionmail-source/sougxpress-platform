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
    // 1. Authoritative totals computation from cart items
    const computedSubtotal = data.cartItems.reduce((acc, item) => acc + (item.product.price_minor * item.quantity), 0);
    const deliveryFee = typeof data.delivery_fee_minor === 'number' ? data.delivery_fee_minor : 15000;
    const platformCommission = 0;
    const computedTotal = computedSubtotal + deliveryFee;

    if (computedTotal <= 0 || computedSubtotal <= 0) {
      throw new Error("مجموع الطلب غير صالح أو السلة فارغة.");
    }

    // 2. Prepare order payload matching authoritative schema
    const orderPayload: any = {
      customer_id: data.customer_id,
      store_id: data.store_id,
      zone_id: data.zone_id,
      // A preferred courier is stored by the validated offer RPC; do not mark the order as assigned before acceptance.
      driver_id: null,
      status: "pending",
      order_total_minor: computedTotal,
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

    // 3. Create Order Items using price_at_order_minor (matching the actual Supabase schema cache)
    const orderItems: any[] = data.cartItems.map(item => ({
      order_id: newOrder.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_order_minor: item.product.price_minor,
      line_total_minor: item.product.price_minor * item.quantity,
    }));

    const createdItems = await createOrderItems(orderItems);
    if (!createdItems) {
      // Rollback order if items fail
      await supabase.from("orders").delete().eq("id", newOrder.id);
      throw new Error("فشل في حفظ عناصر الطلب.");
    }

    // 4. Create Order Status History
    const statusHistory: Omit<OrderStatusHistory, 'id' | 'created_at'> = {
      order_id: newOrder.id,
      status: "pending",
      changed_by: data.customer_id,
      changed_by_role: "customer",
    };

    const createdHistory = await createOrderStatusHistory(statusHistory);
    if (!createdHistory) {
      console.warn("Status history creation failed non-critically, order and items are saved.");
    }

    // 5. If a preferred driver is specified, use the direct delivery offer RPC
    if (data.driver_id) {
      try {
        const { error: directOfferError } = await supabase.rpc('customer_send_direct_delivery_offer', {
          p_order_id: newOrder.id,
          p_driver_id: data.driver_id
        });

        if (directOfferError) {
          throw new Error(directOfferError.message || "تعذر إرسال عرض الموصل المفضل وفق قواعد الأهلية الحالية.");
        }
      } catch (assignErr: any) {
        throw new Error(assignErr?.message || "تعذر إرسال عرض الموصل المفضل.");
      }
    }

    return { success: true, orderId: newOrder.id };
  } catch (error: any) {
    console.error("Checkout process failed:", error);
    return { success: false, error: error.message || "حدث خطأ غير معروف أثناء إتمام الطلب." };
  }
};
