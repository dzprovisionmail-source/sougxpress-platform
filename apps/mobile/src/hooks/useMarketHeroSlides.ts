import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { getHeroRuntimeSettings, getMarketHeroSlides } from "@/services/marketHero.service";
import type { HeroSlide } from "@/components/market/hero/hero.types";
import { HERO_REFRESH_MIN_INTERVAL, shouldRefreshHero } from "@/components/market/hero/hero.refresh";
export { HERO_REFRESH_MIN_INTERVAL, shouldRefreshHero } from "@/components/market/hero/hero.refresh";

let cachedSlides: HeroSlide[] | null = null;
let cachedAt = 0;
let cachedRotationIntervalMs = 6 * 60 * 60 * 1000;
let previousEntityIds = new Set<string>();
const entityKey = (slide: HeroSlide) => `${slide.type}:${slide.entityId || slide.id}`;
const applyRotationHistory = (slides: HeroSlide[]): HeroSlide[] => {
  const manual = slides.filter((slide) => slide.source === "manual");
  const automatic = slides.filter((slide) => slide.source !== "manual");
  const fresh = automatic.filter((slide) => !previousEntityIds.has(entityKey(slide)));
  const orderedAutomatic = [...fresh, ...automatic.filter((slide) => previousEntityIds.has(entityKey(slide)))];
  previousEntityIds = new Set(slides.map(entityKey));
  return [...manual, ...orderedAutomatic];
};

export function useMarketHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>(cachedSlides || []);
  const [loading, setLoading] = useState(!cachedSlides);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedSlides && now - cachedAt < cachedRotationIntervalMs) { setSlides(cachedSlides); return; }
    if (!force && !shouldRefreshHero(lastRefreshAtRef.current, now, HERO_REFRESH_MIN_INTERVAL)) return;
    lastRefreshAtRef.current = now;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const [nextSlides, settings] = await Promise.all([getMarketHeroSlides(), getHeroRuntimeSettings()]);
      if (requestId !== requestIdRef.current) return;
      cachedRotationIntervalMs = settings.rotationIntervalHours * 60 * 60 * 1000;
      cachedSlides = applyRotationHistory(nextSlides);
      cachedAt = Date.now();
      setSlides(cachedSlides);
      setError(null);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setError(cause instanceof Error ? cause.message : "تعذّر تحميل العروض");
    } finally { if (requestId === requestIdRef.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return undefined; }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => { if (nextState === "active") void refresh(); });
    return () => { requestIdRef.current += 1; subscription.remove(); };
  }, [refresh]);
  return { slides, loading, error, refresh };
}
