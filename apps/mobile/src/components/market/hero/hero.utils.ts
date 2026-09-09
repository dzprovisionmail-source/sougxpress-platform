import type { HeroSlide, HeroSlideSource, HeroSlideType, HeroTargetType } from "./hero.types";

const slideTypeMap: Record<string, HeroSlideType> = {
  store: "STORE",
  product: "PRODUCT",
  promotion: "PROMOTION",
  app: "APP",
  internal: "APP",
  custom: "CUSTOM",
};

export const inferHeroSource = (value: unknown, type: HeroSlideType = "CUSTOM"): HeroSlideSource => {
  const normalized = String(value || "").toUpperCase();
  if (["NEW_STORE", "FEATURED_STORE", "NEW_PRODUCT", "FEATURED_PRODUCT", "PROMOTION", "FOUNDER"].includes(normalized)) return normalized as HeroSlideSource;
  if (type === "PROMOTION") return "PROMOTION";
  return "FOUNDER";
};

export const normalizeHeroSlide = (row: any): HeroSlide => {
  const type = slideTypeMap[String(row.content_type || row.type || "custom").toLowerCase()] || "CUSTOM";
  const rawTarget = typeof row.target_id === "string" ? row.target_id : "";
  let targetType: HeroTargetType | undefined;
  let targetId: string | undefined;
  let targetUrl: string | undefined;
  if (rawTarget.startsWith("screen:")) { targetType = "SCREEN"; targetId = rawTarget.slice("screen:".length); }
  else if (rawTarget.startsWith("url:")) { targetType = "URL"; targetUrl = rawTarget.slice("url:".length); }
  else if (rawTarget.startsWith("category:")) { targetType = "CATEGORY"; targetId = rawTarget.slice("category:".length); }
  else if (type === "STORE" || type === "PRODUCT") { targetType = type; targetId = rawTarget || undefined; }
  return {
    id: String(row.id),
    type,
    source: inferHeroSource(row.source || row.hero_source, type),
    entityId: row.entity_id || (type === "STORE" || type === "PRODUCT" ? targetId : undefined),
    imageUrl: String(row.image_url || ""),
    title: row.title || undefined,
    description: row.subtitle || row.description || undefined,
    ctaText: row.cta_label || row.ctaText || undefined,
    targetType,
    targetId,
    targetUrl,
    priority: Number(row.priority || 0),
    isActive: Boolean(row.is_active),
    startsAt: row.start_at || row.starts_at || undefined,
    endsAt: row.end_at || row.ends_at || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
};

export const encodeHeroTarget = (targetType: HeroTargetType | "", targetId: string): string | null => {
  const value = targetId.trim();
  if (!value || !targetType) return null;
  if (targetType === "URL") return `url:${value}`;
  if (targetType === "SCREEN") return `screen:${value}`;
  if (targetType === "CATEGORY") return `category:${value}`;
  return value;
};

export const isSafeExternalUrl = (value?: string): value is string => /^https:\/\//i.test(value || "");
export const isSafeScreenPath = (value?: string): value is string => {
  if (!value) return false;
  return ["/cart", "/login", "/couriers", "/market-section", "/(tabs)/home"].some((path) => value === path || value.startsWith(`${path}?`));
};
export const isUsableHeroImage = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value) && value.length > 12;
export const freshnessScore = (createdAt?: string, nowMs = Date.now()): number => {
  if (!createdAt) return 0;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return 0;
  const ageDays = Math.max(0, (nowMs - createdMs) / 86_400_000);
  return Math.max(0, 100 - Math.min(100, ageDays));
};
