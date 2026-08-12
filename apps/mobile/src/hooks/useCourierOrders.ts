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
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    if (!courierId) {
      setActiveDeliveries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getCourierDeliveries(courierId);
      if (res.data) {
        const active = res.data.filter((d) => ACTIVE_STATUSES.includes(d.status));
        setActiveDeliveries(active);
      } else {
        setActiveDeliveries([]);
      }
    } catch (err) {
      setActiveDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  useEffect(() => {
    fetchDeliveries();

    if (courierId) {
      const { data } = subscribeToCourierDeliveries(courierId, () => {
        fetchDeliveries();
      });
      return () => {
        data.subscription.unsubscribe();
      };
    }
  }, [courierId, fetchDeliveries]);

  return {
    activeDeliveries,
    loading,
    refreshDeliveries: fetchDeliveries,
  };
};

export default useCourierOrders;
