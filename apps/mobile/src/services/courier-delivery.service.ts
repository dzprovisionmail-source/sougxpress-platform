import { supabase } from "@/lib/supabase";
import { Courier, CourierServiceResponse } from "@/types/schema-04-couriers";

export type DeliveryStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["picked_up", "cancelled"],
  picked_up: ["on_the_way", "cancelled"],
  on_the_way: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export interface CourierDelivery {
  id: string;
  order_id: string;
  courier_id: string;
  status: DeliveryStatus;
  customer_id: string;
  store_id: string;
  delivery_address_id: string;
  delivery_fee_minor: number;
  subtotal_minor: number;
  total_minor: number;
  special_instructions: string | null;
  store_name: string;
  customer_name: string;
  customer_phone: string;
  address_text: string;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  on_the_way_at: string | null;
  delivered_at: string | null;
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
      .from("orders")
      .select(
        "*, customer:customers(full_name, phone_number), store:stores(name), address:customer_addresses(address_text)"
      )
      .eq("driver_id", courierId)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    const deliveries: CourierDelivery[] = (data as any[] ?? []).map((order: any) => ({
      id: order.id,
      order_id: order.id,
      driver_id: courierId,
      status: order.status as DeliveryStatus,
      customer_id: order.customer_id,
      store_id: order.store_id,
      delivery_address_id: order.delivery_address_id,
      delivery_fee_minor: order.delivery_fee_minor ?? 0,
      subtotal_minor: order.subtotal_minor ?? 0,
      total_minor: order.total_minor ?? 0,
      special_instructions: order.special_instructions ?? null,
      store_name: order.store?.name ?? "Unknown Store",
      customer_name: order.customer?.full_name ?? "Unknown Customer",
      customer_phone: order.customer?.phone_number ?? "",
      address_text: order.address?.address_text ?? "",
      created_at: order.created_at,
      accepted_at: null,
      picked_up_at: null,
      on_the_way_at: null,
      delivered_at: null,
    }));

    return { data: deliveries, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل جلب التوصيلات" };
  }
};

export const acceptDelivery = async (
  orderId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "accepted" as any,
        driver_id: courierId,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as any as CourierDelivery, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل قبول التوصيل" };
  }
};

export const rejectDelivery = async (
  orderId: string,
  courierId: string
): Promise<CourierServiceResponse<null>> => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "cancelled" as any,
        driver_id: null,
      })
      .eq("id", orderId)
      .eq("driver_id", courierId);

    if (error) throw error;

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل رفض التوصيل" };
  }
};

export const pickUpDelivery = async (
  orderId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "picked_up" as any,
      })
      .eq("id", orderId)
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
  orderId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "on_the_way" as any,
      })
      .eq("id", orderId)
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
  orderId: string,
  courierId: string
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "delivered" as any,
      })
      .eq("id", orderId)
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
  orderId: string,
  courierId: string,
  newStatus: DeliveryStatus
): Promise<CourierServiceResponse<CourierDelivery>> => {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .eq("driver_id", courierId)
      .single();

    if (fetchError) throw fetchError;

    const currentStatus = currentData?.status as DeliveryStatus;
    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        data: null,
        error: `الانتقال من "${currentStatus}" إلى "${newStatus}" غير مسموح`,
      };
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId)
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
    let dateFilter: string;
    switch (period) {
      case "daily":
        dateFilter = "today";
        break;
      case "weekly":
        dateFilter = "week";
        break;
      case "total":
      default:
        dateFilter = "all";
        break;
    }

    let query = supabase
      .from("orders")
      .select("total_minor, delivery_fee_minor")
      .eq("driver_id", courierId)
      .eq("status", "delivered");

    if (dateFilter === "today") {
      query = query.gte("created_at", new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const orders = (data as any[]) ?? [];
    const totalEarnings = orders.reduce(
      (sum, order) => sum + (order.total_minor ?? 0) + (order.delivery_fee_minor ?? 0),
      0
    );

    const stats: DeliveryStats = {
      daily: period === "daily" ? totalEarnings : 0,
      weekly: period === "weekly" ? totalEarnings : 0,
      total: totalEarnings,
      dailyCount: period === "daily" ? orders.length : 0,
      weeklyCount: period === "weekly" ? orders.length : 0,
      totalCount: orders.length,
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
          table: "orders",
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