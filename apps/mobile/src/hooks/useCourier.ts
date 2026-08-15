import { useState, useEffect } from "react";
import { getCourierByUserId } from "@/services/courierService";
import { Courier } from "@/types/schema-04-couriers";
import { subscribeToTableChanges } from "@/lib/realtime-registry";

const useCourier = (userId: string) => {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCourier(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCourier = async () => {
      setLoading(true);
      const res = await getCourierByUserId(userId);
      if (!cancelled) {
        setCourier(res.data);
        setError(res.error);
        setLoading(false);
      }
    };

    fetchCourier();

    const unsubscribe = subscribeToTableChanges(
      `user_courier:${userId}`,
      "couriers",
      `user_id=eq.${userId}`,
      () => {
        if (!cancelled) {
          fetchCourier();
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  return { courier, loading, error };
};

export default useCourier;
