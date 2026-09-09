export type HeroSlideType = "STORE" | "PRODUCT" | "PROMOTION" | "APP" | "CUSTOM";
export type HeroTargetType = "STORE" | "PRODUCT" | "CATEGORY" | "SCREEN" | "URL";
export type HeroSlideSource = "FOUNDER" | "NEW_STORE" | "FEATURED_STORE" | "NEW_PRODUCT" | "FEATURED_PRODUCT" | "PROMOTION";

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
}
