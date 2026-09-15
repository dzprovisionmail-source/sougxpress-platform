import { isUsableHeroImage } from "./hero.utils";
import type { HeroSlide, HeroSlideSource } from "./hero.types";

export const HERO_SOURCE_PRIORITY: Record<HeroSlideSource, number> = {
  manual: 500,
  promotion: 400,
  featured_store: 300,
  new_store: 200,
  product: 100,
};
export const HERO_SOURCE_LIMITS: Record<HeroSlideSource, number> = { manual: 6, promotion: 6, featured_store: 6, new_store: 6, product: 8 };
export const HERO_FINAL_LIMIT = 12;

export type StoreRow = { id: string; name: string; description?: string | null; cover_url?: string | null; logo_url?: string | null; created_at: string; updated_at?: string; status: string; is_new?: boolean; is_featured?: boolean; rating?: number | null };
export type ProductRow = { id: string; store_id: string; name: string; description?: string | null; image_url?: string | null; created_at: string; updated_at?: string; status: string; is_available: boolean; stores?: { name?: string | null } | null };
export type PromotionRow = { id: string; store_id: string; title: string; description?: string | null; image_url?: string | null; discount_type: string; discount_value: number; starts_at: string; ends_at: string; is_active: boolean; created_at: string; stores?: { name?: string | null; status?: string | null; cover_url?: string | null; logo_url?: string | null } | null };

export const storeToHero = (store: StoreRow, source: "new_store" | "featured_store"): HeroSlide | null => {
  const imageUrl = store.cover_url || store.logo_url || "";
  if (store.status !== "active" || !store.id || !isUsableHeroImage(imageUrl)) return null;
  return { id: `${source}-${store.id}`, entityId: store.id, source, type: "STORE", imageUrl, title: store.name, description: store.description || (source === "new_store" ? "اكتشف متجراً جديداً في سوقك المحلي" : "متجر مميز في سوقك المحلي"), ctaText: "زيارة المتجر", targetType: "STORE", targetId: store.id, priority: 0, isActive: true, createdAt: store.created_at, updatedAt: store.updated_at };
};
export const productToHero = (product: ProductRow): HeroSlide | null => {
  if (product.status !== "active" || !product.is_available || !product.id || !isUsableHeroImage(product.image_url)) return null;
  return { id: `product-${product.id}`, entityId: product.id, source: "product", type: "PRODUCT", imageUrl: product.image_url, title: product.name, description: product.stores?.name ? `من ${product.stores.name}` : product.description || "منتج متوفر الآن في السوق", ctaText: "عرض المنتج", targetType: "PRODUCT", targetId: product.id, priority: 0, isActive: true, createdAt: product.created_at, updatedAt: product.updated_at };
};
export const promotionToHero = (promotion: PromotionRow, nowMs = Date.now()): HeroSlide | null => {
  const store = promotion.stores;
  const imageUrl = promotion.image_url || store?.cover_url || store?.logo_url || "";
  const starts = Date.parse(promotion.starts_at); const ends = Date.parse(promotion.ends_at);
  if (!promotion.is_active || !Number.isFinite(starts) || !Number.isFinite(ends) || starts > nowMs || ends < nowMs || store?.status !== "active" || !isUsableHeroImage(imageUrl)) return null;
  const discount = promotion.discount_type === "percentage" ? `${promotion.discount_value}%` : promotion.discount_type === "free_delivery" ? "توصيل مجاني" : `${promotion.discount_value} دج`;
  return { id: `promotion-${promotion.id}`, entityId: promotion.id, source: "promotion", type: "PROMOTION", imageUrl, title: promotion.title, description: `${discount}${store?.name ? ` · ${store.name}` : ""}`, ctaText: "استفد من العرض", targetType: "STORE", targetId: promotion.store_id, priority: 0, isActive: true, startsAt: promotion.starts_at, endsAt: promotion.ends_at, createdAt: promotion.created_at };
};

export interface SmartHeroCandidates { manual: HeroSlide[]; promotions: HeroSlide[]; featuredStores: HeroSlide[]; newStores: HeroSlide[]; products: HeroSlide[]; }
/** Single shared resolver for Market and Founder Preview. Priority is strict and stable. */
export const resolveSmartHeroSlides = (candidates: SmartHeroCandidates): HeroSlide[] => {
  const ordered: HeroSlide[] = [...candidates.manual, ...candidates.promotions, ...candidates.featuredStores, ...candidates.newStores, ...candidates.products];
  const seen = new Set<string>(); const result: HeroSlide[] = [];
  for (const slide of ordered) {
    if (!slide.isActive || !isUsableHeroImage(slide.imageUrl)) continue;
    const identity = `${slide.type}:${slide.entityId || slide.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity); result.push(slide);
    if (result.length >= HERO_FINAL_LIMIT) break;
  }
  return result;
};
export const rankAndDeduplicateHeroSlides = resolveSmartHeroSlides;
export const safeHeroSource = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => { try { return await loader(); } catch { return fallback; } };
