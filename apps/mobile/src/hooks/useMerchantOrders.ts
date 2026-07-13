
import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '../types/schema-03-core';
import { getMerchantOrders, updateOrderStatus, subscribeToMerchantOrders } from '../services/merchant-orders.service';
import { supabase } from '../lib/supabase';

const useMerchantOrders = (merchantId: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const data = await getMerchantOrders(merchantId);
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchOrders();

    if (merchantId) {
      const subscription = subscribeToMerchantOrders(merchantId, () => {
        fetchOrders();
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [merchantId, fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const success = await updateOrderStatus(orderId, newStatus, merchantId);
    if (success) {
      // Optimistic update or wait for realtime
      fetchOrders();
    }
    return success;
  };

  return {
    orders,
    loading,
    error,
    updateStatus: handleUpdateStatus,
    refreshOrders: fetchOrders,
  };
};

export default useMerchantOrders;
