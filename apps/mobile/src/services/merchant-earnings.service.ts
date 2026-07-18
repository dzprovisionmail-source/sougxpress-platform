import { supabase } from "../lib/supabase";

export interface EarningsTransaction {
  id: string;
  amount_minor: number;
  type: string;
  status: string;
  created_at: string;
  order_id: string | null;
}

export interface EarningsSummary {
  totalRevenue: number;
  totalPayout: number;
  pendingPayout: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  recentTransactions: EarningsTransaction[];
}

export interface DeliveryStats {
  totalOrders: number;
  totalDelivered: number;
  totalCancelled: number;
  completionRate: number;
  todayOrders: number;
  todayDelivered: number;
}

export const getMerchantEarnings = async (merchantId: string): Promise<EarningsSummary> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, amount_minor, type, status, created_at, order_id")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      totalRevenue: 0,
      totalPayout: 0,
      pendingPayout: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      recentTransactions: [],
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completed = data.filter((t) => t.status === "completed");
  const payments = completed.filter((t) => t.type === "payment" || t.type === "order_payment");
  const payouts = completed.filter((t) => t.type === "payout");

  const totalRevenue = payments.reduce((s, t) => s + t.amount_minor, 0);
  const totalPayout = payouts.reduce((s, t) => s + t.amount_minor, 0);

  const todayRevenue = payments
    .filter((t) => new Date(t.created_at) >= todayStart)
    .reduce((s, t) => s + t.amount_minor, 0);
  const weekRevenue = payments
    .filter((t) => new Date(t.created_at) >= weekStart)
    .reduce((s, t) => s + t.amount_minor, 0);
  const monthRevenue = payments
    .filter((t) => new Date(t.created_at) >= monthStart)
    .reduce((s, t) => s + t.amount_minor, 0);

  return {
    totalRevenue,
    totalPayout,
    pendingPayout: Math.max(0, totalRevenue - totalPayout),
    todayRevenue,
    weekRevenue,
    monthRevenue,
    recentTransactions: data.slice(0, 15) as EarningsTransaction[],
  };
};

export const getMerchantDeliveryStats = async (storeId: string): Promise<DeliveryStats> => {
  const { data, error } = await supabase
    .from("orders")
    .select("status, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) {
    return {
      totalOrders: 0,
      totalDelivered: 0,
      totalCancelled: 0,
      completionRate: 0,
      todayOrders: 0,
      todayDelivered: 0,
    };
  }

  const today = new Date().toDateString();
  const todayOrders = data.filter((o) => new Date(o.created_at).toDateString() === today);

  const totalOrders = data.length;
  const totalDelivered = data.filter((o) => o.status === "delivered").length;
  const totalCancelled = data.filter((o) => o.status === "cancelled").length;
  const completionRate =
    totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0;

  return {
    totalOrders,
    totalDelivered,
    totalCancelled,
    completionRate,
    todayOrders: todayOrders.length,
    todayDelivered: todayOrders.filter((o) => o.status === "delivered").length,
  };
};
