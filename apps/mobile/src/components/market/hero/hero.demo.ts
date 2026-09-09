import type { HeroSlide } from "./hero.types";

export const demoHeroSlides: HeroSlide[] = [
  {
    id: "demo-promotion",
    type: "PROMOTION",
    source: "PROMOTION",
    imageUrl: "",
    title: "اكتشف عروض السوق",
    description: "اختيارات محلية تصل إلى بابك بسهولة.",
    ctaText: "تسوق الآن",
    priority: 1,
    isActive: true,
  },
  {
    id: "demo-store",
    type: "STORE",
    source: "NEW_STORE",
    imageUrl: "",
    title: "متاجر عين صفراء قريبة منك",
    description: "تصفح المتاجر المحلية واكتشف الجديد.",
    ctaText: "اكتشف المتاجر",
    priority: 2,
    isActive: true,
  },
  {
    id: "demo-product",
    type: "PRODUCT",
    source: "NEW_PRODUCT",
    imageUrl: "",
    title: "كل ما تحتاجه في مكان واحد",
    description: "منتجات يومية من متاجر السوق.",
    ctaText: "استكشف المنتجات",
    priority: 3,
    isActive: true,
  },
];
