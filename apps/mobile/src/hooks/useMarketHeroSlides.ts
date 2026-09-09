import { useEffect, useState } from "react";
import { getMarketHeroSlides } from "@/services/marketHero.service";
import type { HeroSlide } from "@/components/market/hero/hero.types";

export function useMarketHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMarketHeroSlides()
      .then((nextSlides) => {
        if (!mounted) return;
        setSlides(nextSlides);
        setError(null);
      })
      .catch((cause) => {
        if (!mounted) return;
        setSlides([]);
        setError(cause instanceof Error ? cause.message : "تعذّر تحميل العروض");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { slides, loading, error };
}
