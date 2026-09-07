import { supabase } from "@/lib/supabase";
import { Image } from "react-native";
import type { HeroSlide, SmartHeroSliderSettings, SmartHeroSource } from "./heroSlider.service";

export type { SmartHeroSliderSettings, SmartHeroSource } from "./heroSlider.service";

export interface SmartHeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
  target_id?: string;
  kind: "promotion" | "store" | "product";
  source?: SmartHeroSource;
  smartScore?: number;
  smartReason?: string;
}

type Candidate = SmartHeroSlide & {
  source: SmartHeroSource;
  sourceId: string;
  createdAt: number;
  featured?: boolean;
  manualPriority?: number;
};

const recentSmartIds: string[] = [];
const MAX_RECENT_IDS = 12;
const validImage = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const remember = (ids: string[]) => {
  ids.forEach((id) => {
    const index = recentSmartIds.indexOf(id);
    if (index >= 0) recentSmartIds.splice(index, 1);
    recentSmartIds.push(id);
  });
  while (recentSmartIds.length > MAX_RECENT_IDS) recentSmartIds.shift();
};

const scoreCandidate = (candidate: Candidate, sourceWeight: number, newestAt: number, now: number) => {
  const ageDays = Math.max(0, (now - candidate.createdAt) / 86_400_000);
  const freshness = clamp(30 - ageDays * 1.4, 0, 30);
  const featured = candidate.featured ? 22 : 0;
  const imageQuality = validImage(candidate.image) ? 10 : 0;
  const manualPriority = clamp(candidate.manualPriority ?? 0, 0, 100) * 0.25;
  const recencyPenalty = recentSmartIds.includes(candidate.sourceId) ? 35 : 0;
  const repeatPenalty = recentSmartIds[recentSmartIds.length - 1] === candidate.sourceId ? 50 : 0;
  const sourceBalance = (sourceWeight / 100) * 18;
  const normalizedFreshness = newestAt > 0 ? (candidate.createdAt / newestAt) * 10 : 0;
  return freshness + featured + imageQuality + manualPriority + sourceBalance + normalizedFreshness - recencyPenalty - repeatPenalty;
};

/** Deterministic weighted selection with freshness, featured, image, priority, and repeat penalties. */
export function selectSmartHeroSlides(candidates: Candidate[], settings: SmartHeroSliderSettings, limit = 6): SmartHeroSlide[] {
  const enabled = new Set(Object.entries(settings.enabledSources).filter(([, value]) => value).map(([key]) => key));
  const available = candidates.filter((candidate) => enabled.has(candidate.source) && validImage(candidate.image));
  const unique = [...new Map(available.map((candidate) => [candidate.sourceId, candidate])).values()];
  const now = Date.now();
  const newestAt = Math.max(...unique.map((candidate) => candidate.createdAt), 1);
  const ranked = unique.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate, settings.sourceWeights[candidate.source] ?? 0, newestAt, now),
  })).sort((a, b) => b.score - a.score || b.candidate.createdAt - a.candidate.createdAt || a.candidate.sourceId.localeCompare(b.candidate.sourceId));

  const result: Candidate[] = [];
  const sourceCounts = new Map<SmartHeroSource, number>();
  const maxPerSource = Math.max(1, Math.ceil(limit / Math.max(1, new Set(ranked.map(({ candidate }) => candidate.source)).size)) + 1);
  while (ranked.length && result.length < limit) {
    const previous = result[result.length - 1];
    const nextIndex = ranked.findIndex(({ candidate }) => {
      const count = sourceCounts.get(candidate.source) ?? 0;
      return candidate.source !== previous?.source && count < maxPerSource;
    });
    const fallbackIndex = ranked.findIndex(({ candidate }) => (sourceCounts.get(candidate.source) ?? 0) < maxPerSource);
    const index = nextIndex >= 0 ? nextIndex : fallbackIndex;
    if (index < 0) break;
    const [{ candidate, score }] = ranked.splice(index, 1);
    result.push({ ...candidate, smartScore: Math.round(score), smartReason: candidate.featured ? "مميز وحديث مع صورة حقيقية" : "حديث ومتوازن مع مصادر السوق" });
    sourceCounts.set(candidate.source, (sourceCounts.get(candidate.source) ?? 0) + 1);
  }
  remember(result.map((item) => item.sourceId));
  return result.map(({ sourceId: _sourceId, createdAt: _createdAt, featured: _featured, manualPriority: _manualPriority, ...slide }) => slide);
}

const promotionAssets = [
  { id: "fresh", image: require("../../assets/brand/banner_fresh.png"), title: "منتجات طازجة كل يوم", description: "اكتشف اختيارات السوق المحلية" },
  { id: "bakery", image: require("../../assets/brand/banner_bakery.png"), title: "مذاق طازج من المخابز", description: "اطلب ما تحب من متاجر عين الصفراء" },
  { id: "delivery", image: require("../../assets/brand/banner_delivery.png"), title: "توصيل Soug-XPRESS", description: "تجربة تسوق محلية أسهل وأسرع" },
];

export async function getSmartHeroSlides(settings: SmartHeroSliderSettings, limit = 6): Promise<SmartHeroSlide[]> {
  const [productsRes, newStoresRes, featuredStoresRes] = await Promise.all([
    settings.enabledSources.products
      ? supabase.from("products").select("id, name, description, image_url, store_id, created_at, stores(name)").eq("status", "active").eq("is_available", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.new_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_new", true).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.featured_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_featured", true).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const candidates: Candidate[] = [];
  (productsRes.data ?? []).forEach((product: any) => {
    if (!validImage(product.image_url)) return;
    candidates.push({ source: "products", sourceId: `product:${product.id}`, id: `smart-product-${product.id}`, image: product.image_url, title: product.name, description: product.description || "منتج حقيقي من السوق", buttonLabel: "عرض المنتج", storeId: product.store_id, storeName: product.stores?.[0]?.name, target_id: product.id, kind: "product", createdAt: Date.parse(product.created_at || "") || 0 });
  });
  (newStoresRes.data ?? []).forEach((store: any) => {
    const image = validImage(store.cover_url) ? store.cover_url : store.logo_url;
    if (!validImage(image)) return;
    candidates.push({ source: "new_stores", sourceId: `store:new:${store.id}`, id: `smart-new-store-${store.id}`, image, title: `متجر جديد: ${store.name}`, description: store.description || "اكتشف متجرًا جديدًا في عين الصفراء", buttonLabel: "اكتشف المتجر", storeId: store.id, storeName: store.name, target_id: store.id, kind: "store", createdAt: Date.parse(store.created_at || "") || 0 });
  });
  (featuredStoresRes.data ?? []).forEach((store: any) => {
    const image = validImage(store.cover_url) ? store.cover_url : store.logo_url;
    if (!validImage(image)) return;
    candidates.push({ source: "featured_stores", sourceId: `store:featured:${store.id}`, id: `smart-featured-store-${store.id}`, image, title: `متجر مميز: ${store.name}`, description: store.description || "متجر موصى به من Soug-XPRESS", buttonLabel: "زيارة المتجر", storeId: store.id, storeName: store.name, target_id: store.id, kind: "store", featured: true, createdAt: Date.parse(store.created_at || "") || 0 });
  });
  if (settings.enabledSources.promotions) promotionAssets.forEach((promotion, index) => candidates.push({ source: "promotions", sourceId: `promotion:${promotion.id}`, id: `smart-promotion-${promotion.id}`, image: Image.resolveAssetSource(promotion.image)?.uri || "", title: promotion.title, description: promotion.description, buttonLabel: "تسوق الآن", kind: "promotion", createdAt: Date.now() - index * 86_400_000 }));
  return selectSmartHeroSlides(candidates, settings, limit);
}

export function mapManualSlidesToSmart(slides: HeroSlide[]): SmartHeroSlide[] {
  return slides.filter((slide) => slide.is_active && validImage(slide.image_url)).map((slide) => ({
    id: `manual-${slide.id}`,
    image: slide.image_url,
    title: slide.title,
    description: slide.subtitle || "",
    buttonLabel: slide.cta_label || "تسوق الآن",
    target_id: slide.target_id || undefined,
    kind: slide.content_type === "store" ? "store" : slide.content_type === "product" ? "product" : "promotion",
    smartScore: slide.priority,
    smartReason: "اختيار يدوي من المؤسس",
  }));
}
