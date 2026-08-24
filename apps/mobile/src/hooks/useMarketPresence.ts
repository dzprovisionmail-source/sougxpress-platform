import { useCallback, useRef } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  observeMarketPresenceAppState,
  startMarketPresence,
  subscribeToMarketPresence,
  type MarketPresenceActivity,
  type MarketPresencePayload,
  type MarketPresenceRole,
} from "@/services/market-presence.service";
import { supabase } from "@/lib/supabase";

export function useMarketPresence(activity: MarketPresenceActivity): void {
  const params = useLocalSearchParams<{ preview?: string; identity?: string }>();
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const stop = useCallback(async () => {
    const currentStop = stopRef.current;
    stopRef.current = null;
    if (currentStop) await currentStop();
  }, []);

  const start = useCallback(async () => {
    if (params.identity === "soug-admin" || params.preview === "1" || stopRef.current) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "founder" || profile?.role === "admin") return;
    if (profile?.role !== "customer" && profile?.role !== "merchant" && profile?.role !== "driver") return;
    stopRef.current = await startMarketPresence(profile.role as MarketPresenceRole, activity);
  }, [activity, params.identity, params.preview]);

  useFocusEffect(
    useCallback(() => {
      void start();
      const appStateCleanup = observeMarketPresenceAppState(
        () => { void start(); },
        () => { void stop(); },
      );
      return () => {
        appStateCleanup();
        void stop();
      };
    }, [start, stop]),
  );
}

export function useMarketPresenceRoster(onChange: (entries: MarketPresencePayload[]) => void): void {
  useFocusEffect(useCallback(() => subscribeToMarketPresence(onChange), [onChange]));
}
