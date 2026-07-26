import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimeStoreList(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const channel = supabase
      .channel("founder_store_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
