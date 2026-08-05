import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Courier } from "@/types/schema-04-couriers";

const useCourier = (courierId: string) => {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourier = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .eq("id", courierId)
        .single();

      if (error) {
        setError("فشل جلب بيانات الموصل");
      } else if (data) {
        setCourier(data as Courier);
      }
      setLoading(false);
    };

    if (courierId) {
      fetchCourier();

      const channel = supabase
        .channel(`courier:${courierId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "couriers", filter: `id=eq.${courierId}` },
          (payload) => {
            setCourier(payload.new as Courier);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [courierId]);

  const updateCourier = async (updates: Partial<Courier>) => {
    if (!courier) return;
    const { data, error } = await supabase
      .from("couriers")
      .update(updates)
      .eq("id", courier.id)
      .select()
      .single();

    if (data) {
      setCourier(data as Courier);
    }
    return { data, error };
  };

  return { courier, loading, error, updateCourier };
};

export default useCourier;
