import { useCallback, useEffect, useState } from "react";
import { Order } from "../types/schema-03-core";
import {
  getDriverOrders,
  getAvailableOrders,
  acceptOrder,
  updateDeliveryStatus,
  subscribeToDriverOrders,
  subscribeToAvailableOrders,
} from "../services/driver-orders.service";

/**
 * Order enriched with assignment data and joined fields.
 */
export type DriverOrder = Order & {
  assignment_id: string;
  assignment_status: string;
  assignment_driver_id?: string | null;
  store?: { name: string; zone?: { city: string } };
  address?: {
    address_text: string;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state_province?: string | null;
    postal_code?: string | null;
    country?: string | null;
    latitude: number;
    longitude: number;
  };
  customer?: { full_name?: string };
  items?: Array<{
    id: string;
    quantity: number;
    price_at_order_minor: number;
    line_total_minor?: number | null;
    product?: { id: string; name?: string | null; image_url?: string | null } | null;
  }>;
};

const useDriverOrders = (driverId: string, zoneId?: string) => {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ensure driverId is a string and not an object from useCurrentUserId
  const safeDriverId = typeof driverId === 'string' ? driverId : undefined;

  const fetchOrders = useCallback(async () => {
    if (!safeDriverId) return;
    setLoading(true);
    try {
      const [mine, available] = await Promise.all([
        getDriverOrders(safeDriverId),
        zoneId ? getAvailableOrders(zoneId) : Promise.resolve([]),
      ]);
      setOrders(mine);
      setAvailableOrders(available);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [safeDriverId, zoneId]);

  useEffect(() => {
    if (!safeDriverId) return;

    fetchOrders();

    const unsubscribeMine = subscribeToDriverOrders(safeDriverId, () => {
      fetchOrders();
    });
    
    const unsubscribeAvailable = subscribeToAvailableOrders(() => {
      fetchOrders();
    });

    return () => {
      unsubscribeMine();
      unsubscribeAvailable();
    };
  }, [safeDriverId, fetchOrders]);

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
