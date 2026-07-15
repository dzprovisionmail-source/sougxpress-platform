
import { useCallback, useEffect, useState } from "react";
import { Order, OrderStatus } from "../types/schema-03-core";
import {
  getDriverOrders,
  getAvailableOrders,
  acceptOrder,
  updateDeliveryStatus,
  subscribeToDriverOrders,
} from "../services/driver-orders.service";

const useDriverOrders = (driverId: string, zoneId?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const [mine, available] = await Promise.all([
        getDriverOrders(driverId),
        zoneId ? getAvailableOrders(zoneId) : Promise.resolve([]),
      ]);
      setOrders(mine);
      setAvailableOrders(available);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [driverId, zoneId]);

  useEffect(() => {
    fetchOrders();

    if (driverId) {
      const subscription = subscribeToDriverOrders(driverId, () => {
        fetchOrders();
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [driverId, fetchOrders]);

  const handleAccept = async (orderId: string) => {
    const success = await acceptOrder(orderId, driverId);
    if (success) fetchOrders();
    return success;
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const success = await updateDeliveryStatus(orderId, newStatus, driverId);
    if (success) fetchOrders();
    return success;
  };

  return {
    orders,
    availableOrders,
    loading,
    error,
    acceptOrder: handleAccept,
    updateStatus: handleUpdateStatus,
    refreshOrders: fetchOrders,
  };
};

export default useDriverOrders;
