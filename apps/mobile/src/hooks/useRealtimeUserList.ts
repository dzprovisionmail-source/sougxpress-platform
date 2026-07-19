import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type TableName = "customers" | "merchants" | "drivers";

export function useRealtimeUserList(table: TableName, callback: () => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`founder_user_list_${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        callback
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, callback]);
}
