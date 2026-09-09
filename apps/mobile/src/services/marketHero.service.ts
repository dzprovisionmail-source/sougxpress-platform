import { supabase } from "@/lib/supabase";
import { normalizeHeroSlide, encodeHeroTarget, freshnessScore, isUsableHeroImage } from "@/components/market/hero/hero.utils";
import type { HeroSlide, HeroSlideDraft } from "@/components/market/hero/hero.types";
import { HERO_SOURCE_LIMITS, rankAndDeduplicateHeroSlides, productToHero, promotionToHero, storeToHero } from "@/components/market/hero/hero.smart";
import type { StoreRow, ProductRow, PromotionRow } from "@/components/market/hero/hero.smart";
export { HERO_SOURCE_PRIORITY, HERO_SOURCE_LIMITS, HERO_FINAL_LIMIT, rankAndDeduplicateHeroSlides, productToHero, promotionToHero, storeToHero } from "@/components/market/hero/hero.smart";
const heroSelect = "id, title, subtitle, image_url, content_type, target_id, cta_label, is_active, display_order, priority, start_at, end_at, created_at, updated_at";
const nowIso = () => new Date().toISOString();

const isCurrentFounderSlide = (slide: HeroSlide, nowMs: number) => {
  if (!slide.isActive) return false;
  const starts = slide.startsAt ? Date.parse(slide.startsAt) : Number.NEGATIVE_INFINITY;
  const ends = slide.endsAt ? Date.parse(slide.endsAt) : Number.POSITIVE_INFINITY;
  return (!Number.isFinite(starts) || starts <= nowMs) && (!Number.isFinite(ends) || ends >= nowMs);
};

export const safeSource = async <T>(name: string, loader: () => Promise<T>, fallback: T): Promise<T> => {
  try { return await loader(); }
  catch (error) { console.warn(`[hero] ${name} source unavailable`, error); return fallback; }
};

async function getFounderCandidates(activeOnly = true): Promise<HeroSlide[]> {
  let query = supabase.from("market_hero_slides").select(heroSelect).order("priority", { ascending: false }).order("display_order", { ascending: true }).limit(activeOnly ? HERO_SOURCE_LIMITS.FOUNDER : 100);
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  const nowMs = Date.now();
  return (data || []).map((row: any) => normalizeHeroSlide(row)).filter((slide) => !activeOnly || isCurrentFounderSlide(slide, nowMs)).map((slide) => ({ ...slide, source: "FOUNDER" as const }));
}

async function getStoreCandidates(source: "NEW_STORE" | "FEATURED_STORE"): Promise<HeroSlide[]> {
  let query = supabase.from("stores").select("id,name,description,cover_url,logo_url,created_at,updated_at,status,is_new,is_featured,rating").eq("status", "active").is("deleted_at", null).order(source === "FEATURED_STORE" ? "rating" : "created_at", { ascending: false }).limit(HERO_SOURCE_LIMITS[source]);
  query = source === "NEW_STORE" ? query.eq("is_new", true) : query.eq("is_featured", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as StoreRow[]).map((row) => storeToHero(row, source)).filter((slide): slide is HeroSlide => Boolean(slide));
}

async function getProductCandidates(source: "NEW_PRODUCT" | "FEATURED_PRODUCT"): Promise<HeroSlide[]> {
  if (source === "FEATURED_PRODUCT") return [];
  const { data, error } = await supabase.from("products").select("id,store_id,name,description,image_url,created_at,updated_at,status,is_available,stores(name)").eq("status", "active").eq("is_available", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(HERO_SOURCE_LIMITS.NEW_PRODUCT);
  if (error) throw error;
  return ((data || []) as ProductRow[]).map((row) => productToHero(row, source)).filter((slide): slide is HeroSlide => Boolean(slide));
}

async function getPromotionCandidates(): Promise<HeroSlide[]> {
  const now = nowIso();
  const { data, error } = await supabase.from("store_promotions").select("id,store_id,title,description,image_url,discount_type,discount_value,starts_at,ends_at,is_active,created_at,stores(name,status,cover_url,logo_url)").eq("is_active", true).lte("starts_at", now).gte("ends_at", now).order("created_at", { ascending: false }).limit(HERO_SOURCE_LIMITS.PROMOTION);
  if (error) throw error;
  return ((data || []) as PromotionRow[]).map(promotionToHero).filter((slide): slide is HeroSlide => Boolean(slide));
}

export async function getMarketHeroSlides(): Promise<HeroSlide[]> {
  const [founder, newStores, featuredStores, newProducts, featuredProducts, promotions] = await Promise.all([
    safeSource("founder", getFounderCandidates, []),
    safeSource("new stores", () => getStoreCandidates("NEW_STORE"), []),
    safeSource("featured stores", () => getStoreCandidates("FEATURED_STORE"), []),
    safeSource("new products", () => getProductCandidates("NEW_PRODUCT"), []),
    safeSource("featured products", () => getProductCandidates("FEATURED_PRODUCT"), []),
    safeSource("promotions", getPromotionCandidates, []),
  ]);
  return rankAndDeduplicateHeroSlides({ founder, newStores, featuredStores, newProducts, featuredProducts, promotions });
}

export async function getFounderHeroSlides(): Promise<HeroSlide[]> {
  return getFounderCandidates(false);
}

export async function saveFounderHeroSlide(draft: HeroSlideDraft, id?: string) {
  const payload = {
    title: draft.title.trim() || "عرض السوق",
    subtitle: draft.description.trim() || null,
    image_url: draft.imageUrl.trim(),
    content_type: draft.type.toLowerCase(),
    target_id: encodeHeroTarget(draft.targetType, draft.targetId),
    cta_label: draft.ctaText.trim() || null,
    priority: Number.isFinite(draft.priority) ? draft.priority : 0,
    display_order: Number.isFinite(draft.priority) ? draft.priority : 0,
    is_active: draft.isActive,
    start_at: draft.startsAt.trim() || null,
    end_at: draft.endsAt.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = id ? supabase.from("market_hero_slides").update(payload).eq("id", id).select(heroSelect).single() : supabase.from("market_hero_slides").insert(payload).select(heroSelect).single();
  const { data, error } = await query;
  if (error) throw error;
  return normalizeHeroSlide(data);
}

export async function deleteFounderHeroSlide(id: string) {
  const { error } = await supabase.from("market_hero_slides").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateFounderHeroSlide(slide: HeroSlide) {
  return saveFounderHeroSlide({ type: slide.type, imageUrl: slide.imageUrl, title: `${slide.title || "عرض السوق"} (نسخة)`, description: slide.description || "", ctaText: slide.ctaText || "اكتشف الآن", targetType: slide.targetType || "", targetId: slide.targetId || slide.targetUrl || "", priority: slide.priority, isActive: false, startsAt: slide.startsAt || "", endsAt: slide.endsAt || "" });
}

export async function uploadMarketHeroImage(uri: string): Promise<string> {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const extension = uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const path = `hero-slides/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await supabase.storage.from("store_images").upload(path, body, { contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`, upsert: true });
  if (error) throw error;
  return supabase.storage.from("store_images").getPublicUrl(path).data.publicUrl;
}
