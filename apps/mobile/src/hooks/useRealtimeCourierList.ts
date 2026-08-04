import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimeCourierList(callback: () => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("founder_courier_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "couriers" },
        callback
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [callback]);
}
