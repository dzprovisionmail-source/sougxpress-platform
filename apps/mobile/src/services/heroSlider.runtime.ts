import type { HeroSlide, SmartHeroSliderSettings } from "./heroSlider.service";
import type { SmartHeroSlide } from "./smartHeroSlider.service";

export const MAX_HERO_SLIDES = 12;

export interface RuntimeHeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
  target_id?: string;
  target_store_id?: string;
  target_product_id?: string;
  display_duration_seconds?: number;
  transition_duration_ms?: number;
  transition_type?: "slide" | "fade";
  kind: "alert" | "promotion" | "flash" | "store" | "product" | "courier";
  source?: "manual" | "products" | "new_stores" | "featured_stores" | "promotions" | "couriers";
  smartScore?: number;
  smartReason?: string;
  rotation_cycle_id?: string;
  rotation_cycle_started_at?: string;
}

const hasRenderableImage = (slide: { image?: unknown }) => typeof slide.image === "string" && slide.image.trim().length > 0;

export const sortManualSlides = (slides: HeroSlide[]) => [...slides]
  .filter((slide) => slide.is_active)
  .sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));

export const toRuntimeManualSlide = (slide: HeroSlide): RuntimeHeroSlide => ({
  id: `manual-${slide.id}`,
  image: slide.image_url || "",
  title: slide.title,
  description: slide.subtitle || "",
  buttonLabel: slide.cta_label || "تسوق الآن",
  target_id: slide.target_id || undefined,
  target_store_id: slide.target_store_id || undefined,
  target_product_id: slide.target_product_id || undefined,
  kind: slide.content_type === "store" ? "store" : slide.content_type === "product" ? "product" : slide.content_type === "courier" ? "courier" : "promotion",
  source: "manual",
  smartScore: slide.priority,
  smartReason: "اختيار يدوي من المؤسس",
  display_duration_seconds: slide.display_duration_seconds,
  transition_duration_ms: slide.transition_duration_ms,
  transition_type: slide.transition_type,
});

export const toRuntimeSmartSlide = (slide: SmartHeroSlide): RuntimeHeroSlide => ({
  ...slide,
  kind: slide.kind,
});

export function buildFinalHeroSlides(
  mode: SmartHeroSliderSettings["mode"],
  manualSlides: HeroSlide[],
  smartSlides: SmartHeroSlide[],
): RuntimeHeroSlide[] {
  const manual = sortManualSlides(manualSlides).map(toRuntimeManualSlide);
  const smart = smartSlides.map(toRuntimeSmartSlide);
  if (mode === "manual") return manual.slice(0, MAX_HERO_SLIDES);
  if (mode === "smart") return smart.slice(0, MAX_HERO_SLIDES);

  const manualIds = new Set(manual.map((slide) => slide.id));
  const uniqueSmart = smart.filter((slide) => !manualIds.has(`manual-${slide.id}`));
  return [...manual, ...uniqueSmart].slice(0, MAX_HERO_SLIDES);
}

export function normalizeRuntimeSlides(slides: RuntimeHeroSlide[]): RuntimeHeroSlide[] {
  const seen = new Set<string>();
  return slides.filter((slide) => {
    if (seen.has(slide.id)) return false;
    seen.add(slide.id);
    return Boolean(slide.title?.trim()) && (hasRenderableImage(slide) || slide.source === "manual");
  }).slice(0, MAX_HERO_SLIDES);
}
