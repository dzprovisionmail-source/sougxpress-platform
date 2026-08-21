import { useCallback, useEffect, useState } from "react";
import {
  getCourierDeliveries,
  subscribeToCourierDeliveries,
  CourierDelivery,
} from "@/services/courier-delivery.service";
import { DeliveryStatus } from "@/services/courier-delivery.service";

const ACTIVE_STATUSES: DeliveryStatus[] = [
  "pending",
  "accepted",
  "arrived_at_store",
  "picked_up",
  "out_for_delivery",
];

const useCourierOrders = (courierId: string) => {
  const [activeDeliveries, setActiveDeliveries] = useState<CourierDelivery[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Ensure courierId is a string and not an object from useCurrentUserId
  const safeCourierId = typeof courierId === 'string' ? courierId : undefined;

  const fetchDeliveries = useCallback(async () => {
    if (!safeCourierId) {
      setActiveDeliveries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getCourierDeliveries(safeCourierId);
      if (res.data) {
        const active = res.data.filter((d) => ACTIVE_STATUSES.includes(d.status));
        const completed = res.data.filter((d) => ["delivered", "cancelled", "failed"].includes(d.status));
        setActiveDeliveries(active);
        setCompletedDeliveries(completed);
      } else {
        setActiveDeliveries([]);
        setCompletedDeliveries([]);
      }
    } catch (err) {
      setActiveDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [safeCourierId]);

  useEffect(() => {
    if (!safeCourierId) return;

    fetchDeliveries();

    const subRes = subscribeToCourierDeliveries(safeCourierId, () => {
      fetchDeliveries();
    });
    return () => {
      try {
        subRes?.data?.subscription?.unsubscribe?.();
      } catch (e) {
        // Ignore unsubscribe errors safely
      }
    };
  }, [safeCourierId, fetchDeliveries]);

  return {
    activeDeliveries,
    completedDeliveries,
    loading,
    refreshDeliveries: fetchDeliveries,
  };
};

export default useCourierOrders;
