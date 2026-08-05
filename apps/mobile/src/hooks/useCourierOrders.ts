import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourier from "@/hooks/useCourier";
import {
  CourierDelivery,
  DeliveryStatus,
  DeliveryStats,
  acceptDelivery,
  completeDelivery,
  getCourierDeliveries,
  getDeliveryEarnings,
  pickUpDelivery,
  rejectDelivery,
  startDelivery,
  subscribeToCourierDeliveries,
  updateDeliveryStatus,
} from "@/services/courier-delivery.service";

export interface CourierOrder {
  delivery: CourierDelivery;
  isMine: boolean;
}

const useCourierOrders = (courierId: string) => {
  const { userId } = useCurrentUserId();
  const { courier } = useCourier(courierId);
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<CourierDelivery[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<CourierDelivery[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<CourierDelivery[]>([]);
  const [cancelledDeliveries, setCancelledDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<DeliveryStats | null>(null);

  const fetchDeliveries = useCallback(async () => {
    if (!courierId) return;
    setLoading(true);
    try {
      const { data, error: err } = await getCourierDeliveries(courierId);
      if (err) {
        setError(err);
      } else {
        const all = data ?? [];
        setDeliveries(all);
        setPendingDeliveries(all.filter((d) => d.status === "pending"));
        setActiveDeliveries(
          all.filter(
            (d) =>
              d.status === "accepted" ||
              d.status === "picked_up" ||
              d.status === "on_the_way"
          )
        );
        setCompletedDeliveries(all.filter((d) => d.status === "delivered"));
        setCancelledDeliveries(all.filter((d) => d.status === "cancelled"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  const fetchEarnings = useCallback(async (period: "daily" | "weekly" | "total") => {
    if (!courierId) return;
    try {
      const { data, error: err } = await getDeliveryEarnings(courierId, period);
      if (!err && data) {
        setEarnings(data);
      }
    } catch {
      // silent
    }
  }, [courierId]);

  useEffect(() => {
    fetchDeliveries();
    fetchEarnings("total");
  }, [fetchDeliveries, fetchEarnings]);

  useEffect(() => {
    if (!courierId) return;
    const { data, error } = subscribeToCourierDeliveries(courierId, fetchDeliveries);
    if (error) console.error("subscribeToCourierDeliveries failed:", error);
    return () => {
      if (data?.subscription) {
        supabase.removeChannel(data.subscription);
      }
    };
  }, [courierId, fetchDeliveries]);

  const handleAccept = async (orderId: string) => {
    const { data, error } = await acceptDelivery(orderId, courierId);
    if (!error && data) {
      await fetchDeliveries();
    }
    return { data, error };
  };

  const handleReject = async (orderId: string) => {
    const { data, error } = await rejectDelivery(orderId, courierId);
    if (!error) {
      await fetchDeliveries();
    }
    return { data, error };
  };

  const handlePickUp = async (orderId: string) => {
    const { data, error } = await pickUpDelivery(orderId, courierId);
    if (!error && data) {
      await fetchDeliveries();
    }
    return { data, error };
  };

  const handleStartDelivery = async (orderId: string) => {
    const { data, error } = await startDelivery(orderId, courierId);
    if (!error && data) {
      await fetchDeliveries();
    }
    return { data, error };
  };

  const handleComplete = async (orderId: string) => {
    const { data, error } = await completeDelivery(orderId, courierId);
    if (!error && data) {
      await fetchDeliveries();
      await fetchEarnings("total");
    }
    return { data, error };
  };

  const handleUpdateStatus = async (orderId: string, newStatus: DeliveryStatus) => {
    const { data, error } = await updateDeliveryStatus(orderId, courierId, newStatus);
    if (!error && data) {
      await fetchDeliveries();
    }
    return { data, error };
  };

  return {
    deliveries,
    pendingDeliveries,
    activeDeliveries,
    completedDeliveries,
    cancelledDeliveries,
    loading,
    error,
    earnings,
    acceptDelivery: handleAccept,
    rejectDelivery: handleReject,
    pickUpDelivery: handlePickUp,
    startDelivery: handleStartDelivery,
    completeDelivery: handleComplete,
    updateStatus: handleUpdateStatus,
    refreshDeliveries: fetchDeliveries,
    refreshEarnings: fetchEarnings,
  };
};

export default useCourierOrders;