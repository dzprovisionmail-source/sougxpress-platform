import { useCallback, useEffect, useState } from "react";
import { Order } from "../types/schema-03-core";
import {
  getDriverOrders,
  getAvailableOrders,
  acceptOrder,
  updateDeliveryStatus,
  subscribeToDriverOrders,
} from "../services/driver-orders.service";

/**
 * Order enriched with assignment data and joined fields.
 */
export type DriverOrder = Order & {
  assignment_id: string;
  assignment_status: string;
  store?: { name: string; zone?: { city: string } };
  address?: { address_text: string; latitude: number; longitude: number };
  customer?: { full_name?: string; phone?: string };
};

const useDriverOrders = (driverId: string, zoneId?: string) => {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
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

  const handleAccept = async (assignmentId: string) => {
    const success = await acceptOrder(assignmentId, driverId);
    if (success) fetchOrders();
    return success;
  };

  const handleUpdateStatus = async (assignmentId: string, newStatus: string) => {
    const success = await updateDeliveryStatus(assignmentId, newStatus, driverId);
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
