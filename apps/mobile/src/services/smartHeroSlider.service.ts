import { supabase } from "@/lib/supabase";
import { Image } from "react-native";

export type SmartHeroSource = "products" | "new_stores" | "featured_stores" | "promotions";

export interface SmartHeroSliderSettings {
  smartMode: boolean;
  enabledSources: Record<SmartHeroSource, boolean>;
  sourceWeights: Record<SmartHeroSource, number>;
  transitionMs: number;
}

export const DEFAULT_SMART_HERO_SETTINGS: SmartHeroSliderSettings = {
  smartMode: false,
  enabledSources: { products: true, new_stores: true, featured_stores: true, promotions: true },
  sourceWeights: { products: 40, new_stores: 25, featured_stores: 20, promotions: 15 },
  transitionMs: 350,
};

export interface SmartHeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  target_id?: string;
  kind: "promotion" | "store" | "product";
}

type Candidate = SmartHeroSlide & { source: SmartHeroSource; sourceId: string; priority: number };

const validImage = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pure, deterministic selection logic: weighted quotas, priority by recency/featured status, no adjacent duplicates. */
export function selectSmartHeroSlides(candidates: Candidate[], settings: SmartHeroSliderSettings, limit = 6): SmartHeroSlide[] {
  const enabled = new Set(Object.entries(settings.enabledSources).filter(([, value]) => value).map(([key]) => key));
  const available = candidates.filter((candidate) => enabled.has(candidate.source));
  const unique = [...new Map(available.map((candidate) => [candidate.sourceId, candidate])).values()];
  const bySource = new Map<SmartHeroSource, Candidate[]>();
  unique.forEach((candidate) => bySource.set(candidate.source, [...(bySource.get(candidate.source) ?? []), candidate]));
  bySource.forEach((items) => items.sort((a, b) => b.priority - a.priority || a.sourceId.localeCompare(b.sourceId)));

  const sourceOrder = (Object.keys(settings.sourceWeights) as SmartHeroSource[])
    .filter((source) => enabled.has(source) && (bySource.get(source)?.length ?? 0) > 0)
    .sort((a, b) => (settings.sourceWeights[b] ?? 0) - (settings.sourceWeights[a] ?? 0));
  const totalWeight = sourceOrder.reduce((sum, source) => sum + Math.max(0, settings.sourceWeights[source] ?? 0), 0) || sourceOrder.length;
  const quotas = new Map<SmartHeroSource, number>();
  let assigned = 0;
  sourceOrder.forEach((source, index) => {
    const remaining = limit - assigned;
    const ideal = index === sourceOrder.length - 1 ? remaining : Math.max(1, Math.round((Math.max(0, settings.sourceWeights[source] ?? 0) / totalWeight) * limit));
    const quota = Math.min(ideal, bySource.get(source)?.length ?? 0, remaining);
    quotas.set(source, quota);
    assigned += quota;
  });
  while (assigned < limit) {
    const source = sourceOrder.find((candidateSource) => (bySource.get(candidateSource)?.length ?? 0) > (quotas.get(candidateSource) ?? 0));
    if (!source) break;
    quotas.set(source, (quotas.get(source) ?? 0) + 1);
    assigned += 1;
  }

  const result: Candidate[] = [];
  while (result.length < limit && sourceOrder.length > 0) {
    const nextSource = sourceOrder.find((source) => (quotas.get(source) ?? 0) > 0 && (bySource.get(source)?.length ?? 0) > 0 && result[result.length - 1]?.source !== source)
      ?? sourceOrder.find((source) => (quotas.get(source) ?? 0) > 0 && (bySource.get(source)?.length ?? 0) > 0);
    if (!nextSource) break;
    const item = bySource.get(nextSource)!.shift()!;
    quotas.set(nextSource, quotas.get(nextSource)! - 1);
    result.push(item);
  }
  return result.map(({ source: _source, sourceId: _sourceId, ...slide }) => slide);
}

export async function getSmartHeroSlides(settings: SmartHeroSliderSettings, limit = 6): Promise<SmartHeroSlide[]> {
  const [productsRes, newStoresRes, featuredStoresRes] = await Promise.all([
    settings.enabledSources.products
      ? supabase.from("products").select("id, name, description, image_url, store_id, created_at, stores(name)").eq("status", "active").not("image_url", "is", null).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.new_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_new", true).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.featured_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_featured", true).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const candidates: Candidate[] = [];
  (productsRes.data ?? []).forEach((product: any) => {
    if (!validImage(product.image_url)) return;
    candidates.push({ source: "products", sourceId: `product:${product.id}`, id: `smart-product-${product.id}`, image: product.image_url, title: product.name, description: product.description || "منتج جديد من السوق", buttonLabel: "عرض المنتج", target_id: product.id, kind: "product", priority: Date.parse(product.created_at || "") || 0 } as Candidate);
  });
  (newStoresRes.data ?? []).forEach((store: any) => {
    const image = validImage(store.cover_url) ? store.cover_url : store.logo_url;
    if (!validImage(image)) return;
    candidates.push({ source: "new_stores", sourceId: `store:${store.id}`, id: `smart-new-store-${store.id}`, image, title: `متجر جديد: ${store.name}`, description: store.description || "اكتشف متجرًا جديدًا في عين الصفراء", buttonLabel: "اكتشف المتجر", storeId: store.id, target_id: store.id, kind: "store", priority: Date.parse(store.created_at || "") || 0 } as Candidate);
  });
  (featuredStoresRes.data ?? []).forEach((store: any) => {
    const image = validImage(store.cover_url) ? store.cover_url : store.logo_url;
    if (!validImage(image)) return;
    candidates.push({ source: "featured_stores", sourceId: `store:${store.id}`, id: `smart-featured-store-${store.id}`, image, title: `متجر مميز: ${store.name}`, description: store.description || "متجر موصى به من Soug-XPRESS", buttonLabel: "زيارة المتجر", storeId: store.id, target_id: store.id, kind: "store", priority: (Date.parse(store.created_at || "") || 0) + 1 } as Candidate);
  });
  const officialPromotions = [
    { id: "fresh", image: require("../../assets/brand/banner_fresh.png"), title: "منتجات طازجة كل يوم", description: "اكتشف اختيارات السوق المحلية" },
    { id: "bakery", image: require("../../assets/brand/banner_bakery.png"), title: "مذاق طازج من المخابز", description: "اطلب ما تحب من متاجر عين الصفراء" },
    { id: "delivery", image: require("../../assets/brand/banner_delivery.png"), title: "توصيل Soug-XPRESS", description: "تجربة تسوق محلية أسهل وأسرع" },
  ];
  if (settings.enabledSources.promotions) officialPromotions.forEach((promotion, index) => candidates.push({ source: "promotions", sourceId: `promotion:${promotion.id}`, id: `smart-promotion-${promotion.id}`, image: Image.resolveAssetSource(promotion.image)?.uri || "", title: promotion.title, description: promotion.description, buttonLabel: "تسوق الآن", kind: "promotion", priority: 100 - index } as Candidate));

  return selectSmartHeroSlides(candidates, { ...settings, transitionMs: clamp(settings.transitionMs, 150, 1000) }, limit);
}
