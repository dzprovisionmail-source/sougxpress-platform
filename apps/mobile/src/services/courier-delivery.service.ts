import { supabase } from "@/lib/supabase";
import { CourierServiceResponse } from "@/types/schema-04-couriers";

export type DeliveryStatus =
  | "pending"
  | "accepted"
  | "arrived_at_store"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["arrived_at_store", "cancelled"],
  arrived_at_store: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "failed"],
  delivered: [],
  cancelled: [],
  failed: [],
};

export interface CourierDelivery {
  id: string;
  order_id: string;
  driver_id: string;
  status: DeliveryStatus;
  customer_id: string;
  store_id: string;
  merchant_id: string; // Added for chat context
  delivery_address_id: string;
  delivery_fee_minor: number;
  subtotal_minor: number;
  total_minor: number;
  special_instructions: string | null;
  store_name: string;
  store_address: string; // Added for UI consistency
  customer_name: string;
  address_text: string;
  created_at: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  items?: Array<{
    id: string;
    quantity: number;
    price_at_order_minor: number;
    line_total_minor?: number | null;
    product?: { id: string; name?: string | null; image_url?: string | null } | null;
  }>;
}

export interface DeliveryStats {
  daily: number;
  weekly: number;
  total: number;
  dailyCount: number;
  weeklyCount: number;
  totalCount: number;
}

function isValidTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from]?.includes(to) ?? false;
}

export const getCourierDeliveries = async (
  courierId: string,
  statusFilter?: DeliveryStatus
): Promise<CourierServiceResponse<CourierDelivery[]>> => {
  try {
    let query = supabase
      .from("delivery_assignments")
      .select(`
        *,
        order:orders (
          *,
          customer:customers (full_name),
          store:stores (name, merchant_id, address_line1, city),
          address:customer_addresses (address_text),
          items:order_items (
            id,
            quantity,
            price_at_order_minor,
            line_total_minor,
            product:products (id, name, image_url)
          )
        )
      `)
      .eq("driver_id", courierId)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    const deliveries: CourierDelivery[] = (data as any[] ?? []).map((assignment: any) => {
      const order = assignment.order;
      const store = order?.store;
      
      return {
        id: assignment.id,
        order_id: assignment.order_id,
        driver_id: courierId,
        status: assignment.status as DeliveryStatus,
        customer_id: order?.customer_id,
        store_id: order?.store_id,
        merchant_id: store?.merchant_id || "",
        delivery_address_id: order?.delivery_address_id,
        delivery_fee_minor: order?.delivery_fee_minor ?? 15000, // Fallback to 150 DZD
        subtotal_minor: order?.order_total_minor ?? 0,
        total_minor: (order?.order_total_minor ?? 0) + (order?.delivery_fee_minor ?? 15000),
        special_instructions: order?.special_instructions ?? null,
        store_name: store?.name ?? "متجر Soug-XPRESS",
        store_address: store?.address_line1 || store?.city || "عين صفراء",
        customer_name: order?.customer?.full_name ?? "زبون",
        address_text: order?.address?.address_text ?? "العنوان غير متوفر",
        created_at: assignment.created_at,
        assigned_at: assignment.assigned_at,
        picked_up_at: assignment.picked_up_at,
        delivered_at: assignment.delivered_at,
        items: order?.items || [],
      };
    });

    return { data: deliveries, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل جلب التوصيلات" };
  }
};

export const acceptDelivery = async (
  assignmentId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("delivery_assignments")
      .update({
        status: "accepted" as any,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل قبول التوصيل" };
  }
};

export const arriveAtStore = async (
  assignmentId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("delivery_assignments")
      .update({
        status: "arrived_at_store" as any,
      })
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل تحديث الوصول للمتجر" };
  }
};

export const pickUpDelivery = async (
  assignmentId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("delivery_assignments")
      .update({
        status: "picked_up" as any,
        picked_up_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل تحديث حالة الاستلام" };
  }
};

export const startDelivery = async (
  assignmentId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("delivery_assignments")
      .update({
        status: "out_for_delivery" as any,
      })
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل بدء التوصيل" };
  }
};

export const completeDelivery = async (
  assignmentId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("delivery_assignments")
      .update({
        status: "delivered" as any,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل إتمام التوصيل" };
  }
};

export const updateDeliveryStatus = async (
  assignmentId: string,
  courierId: string,
  newStatus: DeliveryStatus
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "delivered") {
      updates.delivered_at = new Date().toISOString();
    } else if (newStatus === "picked_up") {
      updates.picked_up_at = new Date().toISOString();
    } else if (newStatus === "accepted") {
      updates.assigned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("delivery_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .eq("driver_id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل تحديث حالة التوصيل" };
  }
};

export const getDeliveryEarnings = async (
  courierId: string,
  period: "daily" | "weekly" | "total"
): Promise<CourierServiceResponse<DeliveryStats>> => {
  try {
    let query = supabase
      .from("delivery_assignments")
      .select("*, order:orders(total_minor, delivery_fee_minor)")
      .eq("driver_id", courierId)
      .eq("status", "delivered");

    if (period === "daily") {
      query = query.gte("created_at", new Date().toISOString().split("T")[0]);
    } else if (period === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const assignments = (data as any[]) ?? [];
    const totalEarnings = assignments.reduce(
      (sum, assignment) => sum + (assignment.order?.total_minor ?? 0) + (assignment.order?.delivery_fee_minor ?? 0),
      0
    );

    const stats: DeliveryStats = {
      daily: period === "daily" ? totalEarnings : 0,
      weekly: period === "weekly" ? totalEarnings : 0,
      total: totalEarnings,
      dailyCount: period === "daily" ? assignments.length : 0,
      weeklyCount: period === "weekly" ? assignments.length : 0,
      totalCount: assignments.length,
    };

    return { data: stats, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل جلب أرباح التوصيل" };
  }
};

export const subscribeToCourierDeliveries = (
  courierId: string,
  callback: () => void
): { data: { subscription: any }; error: string | null } => {
  try {
    const channel = supabase
      .channel(`courier_deliveries:${courierId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_assignments",
          filter: `driver_id=eq.${courierId}`,
        },
        callback
      )
      .subscribe();

    return { data: { subscription: channel }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل الاشتراك في التوصيلات" };
  }
};
