import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { getMarketHeroSlides } from "@/services/marketHero.service";
import type { HeroSlide } from "@/components/market/hero/hero.types";
import { HERO_REFRESH_MIN_INTERVAL, shouldRefreshHero } from "@/components/market/hero/hero.refresh";
export { HERO_REFRESH_MIN_INTERVAL, shouldRefreshHero } from "@/components/market/hero/hero.refresh";

export function useMarketHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && !shouldRefreshHero(lastRefreshAtRef.current, now, HERO_REFRESH_MIN_INTERVAL)) return;
    lastRefreshAtRef.current = now;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const nextSlides = await getMarketHeroSlides();
      if (requestId !== requestIdRef.current) return;
      setSlides(nextSlides);
      setError(null);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setSlides([]);
      setError(cause instanceof Error ? cause.message : "تعذّر تحميل العروض");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    return undefined;
  }, [refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refresh();
    });
    return () => {
      requestIdRef.current += 1;
      subscription.remove();
    };
  }, [refresh]);

  return { slides, loading, error, refresh };
}
