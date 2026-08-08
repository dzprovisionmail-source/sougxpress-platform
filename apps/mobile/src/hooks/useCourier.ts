import { useState, useEffect, useCallback } from "react";
import { getCourierByUserId } from "@/services/courierService";
import { Courier } from "@/types/schema-04-couriers";
import { supabase } from "@/lib/supabase";

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

    const channel = supabase
      .channel(`user_courier:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couriers",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCourier();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { courier, loading, error };
};

export default useCourier;
