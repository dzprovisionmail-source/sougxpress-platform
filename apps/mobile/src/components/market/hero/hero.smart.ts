import { freshnessScore, isUsableHeroImage } from "./hero.utils";
import type { HeroSlide, HeroSlideSource } from "./hero.types";

export const HERO_SOURCE_PRIORITY: Record<HeroSlideSource, number> = {
  FOUNDER: 600,
  FEATURED_STORE: 500,
  FEATURED_PRODUCT: 500,
  PROMOTION: 450,
  NEW_STORE: 300,
  NEW_PRODUCT: 300,
};

export const HERO_SOURCE_LIMITS: Record<HeroSlideSource, number> = {
  FOUNDER: 6,
  FEATURED_STORE: 4,
  FEATURED_PRODUCT: 4,
  PROMOTION: 4,
  NEW_STORE: 4,
  NEW_PRODUCT: 4,
};

export const HERO_FINAL_LIMIT = 12;

export type StoreRow = {
  id: string; name: string; description?: string | null; cover_url?: string | null; logo_url?: string | null;
  created_at: string; updated_at?: string; status: string; is_new?: boolean; is_featured?: boolean; rating?: number | null;
};
export type ProductRow = {
  id: string; store_id: string; name: string; description?: string | null; image_url?: string | null;
  created_at: string; updated_at?: string; status: string; is_available: boolean; stores?: { name?: string | null } | null;
};
export type PromotionRow = {
  id: string; store_id: string; title: string; description?: string | null; image_url?: string | null;
  discount_type: string; discount_value: number; starts_at: string; ends_at: string; is_active: boolean; created_at: string;
  stores?: { name?: string | null; status?: string | null; cover_url?: string | null; logo_url?: string | null } | null;
};

export const storeToHero = (store: StoreRow, source: "NEW_STORE" | "FEATURED_STORE"): HeroSlide | null => {
  const imageUrl = store.cover_url || store.logo_url || "";
  if (store.status !== "active" || !store.id || !isUsableHeroImage(imageUrl)) return null;
  return { id: `${source.toLowerCase()}-${store.id}`, entityId: store.id, source, type: "STORE", imageUrl, title: store.name, description: store.description || (source === "NEW_STORE" ? "اكتشف متجراً جديداً في سوقك المحلي" : "متجر مميز في سوقك المحلي"), ctaText: "زيارة المتجر", targetType: "STORE", targetId: store.id, priority: Number(store.is_featured ? 10 : 0), isActive: true, createdAt: store.created_at, updatedAt: store.updated_at };
};

export const productToHero = (product: ProductRow, source: "NEW_PRODUCT" | "FEATURED_PRODUCT"): HeroSlide | null => {
  if (product.status !== "active" || !product.is_available || !product.id || !isUsableHeroImage(product.image_url)) return null;
  return { id: `${source.toLowerCase()}-${product.id}`, entityId: product.id, source, type: "PRODUCT", imageUrl: product.image_url, title: product.name, description: product.stores?.name ? `من ${product.stores.name}` : product.description || "منتج متوفر الآن في السوق", ctaText: "عرض المنتج", targetType: "PRODUCT", targetId: product.id, priority: 0, isActive: true, createdAt: product.created_at, updatedAt: product.updated_at };
};

export const promotionToHero = (promotion: PromotionRow, nowMs = Date.now()): HeroSlide | null => {
  const store = promotion.stores;
  const imageUrl = promotion.image_url || store?.cover_url || store?.logo_url || "";
  if (!promotion.is_active || Date.parse(promotion.starts_at) > nowMs || Date.parse(promotion.ends_at) < nowMs || store?.status === "suspended" || !isUsableHeroImage(imageUrl)) return null;
  const discount = promotion.discount_type === "percentage" ? `${promotion.discount_value}%` : promotion.discount_type === "free_delivery" ? "توصيل مجاني" : `${promotion.discount_value} دج`;
  return { id: `promotion-${promotion.id}`, entityId: promotion.id, source: "PROMOTION", type: "PROMOTION", imageUrl, title: promotion.title, description: `${discount}${store?.name ? ` · ${store.name}` : ""}`, ctaText: "استفد من العرض", targetType: "STORE", targetId: promotion.store_id, priority: 0, isActive: true, startsAt: promotion.starts_at, endsAt: promotion.ends_at, createdAt: promotion.created_at };
};

export interface SmartHeroCandidates {
  founder: HeroSlide[];
  newStores: HeroSlide[];
  featuredStores: HeroSlide[];
  newProducts: HeroSlide[];
  featuredProducts: HeroSlide[];
  promotions: HeroSlide[];
}

export const rankAndDeduplicateHeroSlides = (candidates: SmartHeroCandidates, nowMs = Date.now()): HeroSlide[] => {
  const byEntity = new Map<string, { slide: HeroSlide; score: number }>();
  for (const slide of Object.values(candidates).flat()) {
    const identity = slide.entityId ? `${slide.type}:${slide.entityId}` : `slide:${slide.id}`;
    const score = HERO_SOURCE_PRIORITY[slide.source] + slide.priority + freshnessScore(slide.createdAt, nowMs) / 100;
    const previous = byEntity.get(identity);
    if (!previous || score > previous.score) byEntity.set(identity, { slide, score });
  }
  return [...byEntity.values()].sort((a, b) => b.score - a.score || (b.slide.createdAt || "").localeCompare(a.slide.createdAt || "")).slice(0, HERO_FINAL_LIMIT).map(({ slide }) => slide);
};

export const safeHeroSource = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => {
  try { return await loader(); }
  catch { return fallback; }
};
