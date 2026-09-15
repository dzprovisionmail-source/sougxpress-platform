export type HeroSlideType = "STORE" | "PRODUCT" | "PROMOTION" | "APP" | "CUSTOM";
export type HeroTargetType = "STORE" | "PRODUCT" | "CATEGORY" | "SCREEN" | "URL";
/** Debuggable resolver source; values intentionally mirror the product requirement. */
export type HeroSlideSource = "manual" | "promotion" | "featured_store" | "new_store" | "product";

export interface HeroSlide {
  id: string;
  type: HeroSlideType;
  source: HeroSlideSource;
  entityId?: string;
  imageUrl: string;
  title?: string;
  description?: string;
  ctaText?: string;
  targetType?: HeroTargetType;
  targetId?: string;
  targetUrl?: string;
  priority: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
  pinToTop?: boolean;
  displayDurationSeconds?: number;
}

export interface HeroSlideDraft {
  type: HeroSlideType;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  targetType: HeroTargetType | "";
  targetId: string;
  priority: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  pinToTop?: boolean;
  displayDurationSeconds?: number;
}
