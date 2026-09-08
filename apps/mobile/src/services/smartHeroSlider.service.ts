import { supabase } from "@/lib/supabase";
import { Image } from "react-native";
import type { HeroSlide, SmartHeroSliderSettings } from "./heroSlider.service";
import { selectSmartHeroSlides, type SmartCandidate, type SmartSelectionSlide } from "./smartHeroSelection";
import { getPreviousCourierId, rememberCourierOfTheDay } from "./heroRotationCycle";

export type { SmartHeroSliderSettings } from "./heroSlider.service";
export type SmartHeroSlide = SmartSelectionSlide;

const validImage = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const promotionAssets = [
  { id: "fresh", image: require("../../assets/brand/banner_fresh.png"), title: "منتجات طازجة كل يوم", description: "اكتشف اختيارات السوق المحلية" },
  { id: "bakery", image: require("../../assets/brand/banner_bakery.png"), title: "مذاق طازج من المخابز", description: "اطلب ما تحب من متاجر عين الصفراء" },
  { id: "delivery", image: require("../../assets/brand/banner_delivery.png"), title: "توصيل Soug-XPRESS", description: "تجربة تسوق محلية أسهل وأسرع" },
];

export async function getSmartHeroSlides(settings: SmartHeroSliderSettings, limit = 12, rotationSeed = "default"): Promise<SmartHeroSlide[]> {
  const [productsRes, newStoresRes, featuredStoresRes, promotionsRes, couriersRes] = await Promise.all([
    settings.enabledSources.products
      ? supabase.from("products").select("id, name, description, image_url, store_id, created_at, stores(name)").eq("status", "active").eq("is_available", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.new_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_new", true).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.featured_stores
      ? supabase.from("stores").select("id, name, description, cover_url, logo_url, created_at").eq("status", "active").eq("is_featured", true).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.promotions
      ? supabase.from("store_promotions").select("id, title, description, image_url, store_id, created_at, discount_value, discount_type").eq("is_active", true).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: [], error: null }),
    settings.enabledSources.couriers
      ? supabase.from("couriers").select("id, full_name, bio, avatar_url, rating, vehicle_type, is_available, is_mock, show_on_home, display_order").eq("is_available", true).eq("show_on_home", true).eq("is_mock", false).order("display_order", { ascending: true }).limit(24)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const candidates: SmartCandidate[] = [];
  (productsRes.data ?? []).forEach((product: any) => {
    if (!validImage(product.image_url)) return;
    const storeName = Array.isArray(product.stores) ? product.stores[0]?.name : product.stores?.name;
    candidates.push({ source: "products", sourceId: `product:${product.id}`, id: `smart-product-${product.id}`, image: product.image_url, title: product.name, description: product.description || "منتج حقيقي من السوق", buttonLabel: "عرض المنتج", storeId: product.store_id, storeName, target_id: product.id, kind: "product", createdAt: Date.parse(product.created_at || "") || 0 });
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
  (promotionsRes.data ?? []).forEach((promotion: any) => {
    if (!validImage(promotion.image_url)) return;
    candidates.push({ source: "promotions", sourceId: `promotion:live:${promotion.id}`, id: `smart-live-promotion-${promotion.id}`, image: promotion.image_url, title: promotion.title, description: promotion.description || `عرض ${promotion.discount_value ?? "خاص"}`, buttonLabel: "استفد الآن", storeId: promotion.store_id, target_id: promotion.id, kind: "promotion", featured: true, createdAt: Date.parse(promotion.created_at || "") || 0 });
  });
  const previousCourierId = await getPreviousCourierId();
  const courierRows = (couriersRes.data ?? []).filter((courier: any) => courier.id !== previousCourierId);
  if (courierRows.length > 0) {
    const hashCourier = (id: string) => {
      let hash = 2166136261;
      for (const char of `${rotationSeed}:courier:${id}`) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const courier = [...courierRows].sort((a: any, b: any) => hashCourier(a.id) - hashCourier(b.id))[0];
    const image = validImage(courier.avatar_url) ? courier.avatar_url : Image.resolveAssetSource(require("../../assets/brand/icon-courier.png")).uri;
    candidates.push({ source: "couriers", sourceId: `courier:${courier.id}`, id: `courier-${courier.id}`, image, title: `موصل اليوم: ${courier.full_name}`, description: courier.bio || `تقييم ${Number(courier.rating || 0).toFixed(1)} · جاهز لخدمتك`, buttonLabel: "تعرّف على الموصل", target_id: courier.id, kind: "courier", createdAt: Date.now(), smartReason: "موصل نشط مختار للدورة الحالية" });
    void rememberCourierOfTheDay(courier.id);
  }
  if (settings.enabledSources.promotions) promotionAssets.forEach((promotion, index) => candidates.push({ source: "promotions", sourceId: `promotion:${promotion.id}`, id: `smart-promotion-${promotion.id}`, image: Image.resolveAssetSource(promotion.image)?.uri || "", title: promotion.title, description: promotion.description, buttonLabel: "تسوق الآن", kind: "promotion", createdAt: Date.now() - index * 86_400_000 }));
  return selectSmartHeroSlides(candidates, settings, Math.min(12, settings.maxSlides || limit), rotationSeed);
}

export function mapManualSlidesToSmart(slides: HeroSlide[]): SmartHeroSlide[] {
  return slides.filter((slide) => slide.is_active).map((slide) => ({
    id: `manual-${slide.id}`,
    image: slide.image_url,
    title: slide.title,
    description: slide.subtitle || "",
    buttonLabel: slide.cta_label || "تسوق الآن",
    target_id: slide.target_id || undefined,
    display_duration_seconds: slide.display_duration_seconds,
    transition_duration_ms: slide.transition_duration_ms,
    transition_type: slide.transition_type,
    kind: slide.content_type === "store" ? "store" : slide.content_type === "product" ? "product" : slide.content_type === "courier" ? "courier" : "promotion",
    smartScore: slide.priority,
    smartReason: "اختيار يدوي من المؤسس",
  }));
}
