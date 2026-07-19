
import { supabase } from "../lib/supabase";
import { Order, OrderItem, OrderStatusHistory } from "../types/schema-03-core";

export const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order | null> => {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    return null;
  }
  return data as Order;
};

export const createOrderItems = async (items: Omit<OrderItem, 'id'>[]): Promise<OrderItem[] | null> => {
  const { data, error } = await supabase
    .from("order_items")
    .insert(items)
    .select();

  if (error) {
    console.error("Error creating order items:", error);
    return null;
  }
  return data as OrderItem[];
};

export const createOrderStatusHistory = async (history: Omit<OrderStatusHistory, 'id' | 'created_at'>): Promise<OrderStatusHistory | null> => {
  const { data, error } = await supabase
    .from("order_status_history")
    .insert(history)
    .select()
    .single();

  if (error) {
    console.error("Error creating order status history:", error);
    return null;
  }
  return data as OrderStatusHistory;
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching order:", error);
    return null;
  }
  return data as Order;
};

export const getOrderItemsByOrderId = async (orderId: string): Promise<OrderItem[]> => {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error) {
    console.error("Error fetching order items:", error);
    return [];
  }
  return data as OrderItem[];
};

export const validateMerchantOrderOwnership = async (orderId: string, merchantId: string): Promise<boolean> => {
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("merchant_id", merchantId);

  if (!stores || stores.length === 0) return false;

  const storeIds = stores.map(s => s.id);
  const { data: order, error } = await supabase
    .from("orders")
    .select("store_id")
    .eq("id", orderId)
    .in("store_id", storeIds)
    .maybeSingle();

  if (error || !order) return false;
  return true;
};
