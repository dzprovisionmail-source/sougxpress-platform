import { encodeHeroTarget, isSafeExternalUrl, isSafeScreenPath, normalizeHeroSlide } from "../src/components/market/hero/hero.utils";
import { demoHeroSlides } from "../src/components/market/hero/hero.demo";
import { productToHero, promotionToHero, rankAndDeduplicateHeroSlides, safeHeroSource, storeToHero } from "../src/components/market/hero/hero.smart";
import { HERO_AUTOPLAY_INTERVAL, clampHeroIndex, nextHeroIndex, shouldRunHeroAutoplay } from "../src/components/market/hero/hero.autoplay";
import { HERO_REFRESH_MIN_INTERVAL, shouldRefreshHero } from "../src/components/market/hero/hero.refresh";

let passed = 0;
let failed = 0;
function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual === expected) { passed += 1; console.log(`  ✅ ${label}`); }
  else { failed += 1; console.log(`  ❌ ${label}: expected ${String(expected)}, got ${String(actual)}`); }
}
function deepEqual(actual: unknown, expected: unknown, label: string): void {
  equal(JSON.stringify(actual), JSON.stringify(expected), label);
}

equal(demoHeroSlides.length, 3, "local demo fixture contains three slides");

const slide = normalizeHeroSlide({
  id: "slide-1",
  title: "متجر قريب",
  subtitle: "اكتشف الجديد",
  image_url: "https://cdn.example.test/hero.jpg",
  content_type: "store",
  target_id: "store-1",
  cta_label: "اكتشف",
  is_active: true,
  priority: 8,
  start_at: null,
  end_at: null,
});
equal(slide.type, "STORE", "database content type normalizes");
equal(slide.source, "FOUNDER", "Founder rows preserve Founder source");
equal(slide.targetType, "STORE", "store target type normalizes");
equal(slide.targetId, "store-1", "store target id normalizes");
equal(slide.imageUrl, "https://cdn.example.test/hero.jpg", "image URL is preserved");

deepEqual(normalizeHeroSlide({ id: "screen", content_type: "custom", target_id: "screen:/cart", is_active: true, priority: 1 }), {
  id: "screen",
  type: "CUSTOM",
  source: "FOUNDER",
  entityId: undefined,
  imageUrl: "",
  title: undefined,
  description: undefined,
  ctaText: undefined,
  targetType: "SCREEN",
  targetId: "/cart",
  targetUrl: undefined,
  priority: 1,
  isActive: true,
  startsAt: undefined,
  endsAt: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}, "screen target normalizes");

equal(encodeHeroTarget("URL", "https://example.test/promo"), "url:https://example.test/promo", "URL target encodes");
equal(encodeHeroTarget("SCREEN", "/cart"), "screen:/cart", "screen target encodes");
equal(encodeHeroTarget("", ""), null, "empty target is omitted");
equal(isSafeExternalUrl("https://example.test"), true, "HTTPS URL is allowed");
equal(isSafeExternalUrl("javascript:alert(1)"), false, "unsafe URL is rejected");
equal(isSafeScreenPath("/cart"), true, "allowlisted screen is allowed");
equal(isSafeScreenPath("/admin/users"), false, "unknown screen is rejected");

const image = "https://cdn.example.test/item.jpg";
const store = storeToHero({ id: "store-1", name: "متجر جديد", description: "وصف", cover_url: image, logo_url: null, created_at: "2026-09-09T00:00:00Z", status: "active", is_new: true, is_featured: false }, "NEW_STORE");
const featuredStore = storeToHero({ id: "store-2", name: "متجر مميز", cover_url: image, created_at: "2026-09-08T00:00:00Z", status: "active", is_featured: true }, "FEATURED_STORE");
const product = productToHero({ id: "product-1", store_id: "store-1", name: "منتج جديد", image_url: image, created_at: "2026-09-09T00:00:00Z", status: "active", is_available: true, stores: { name: "متجر جديد" } }, "NEW_PRODUCT");
const promotion = promotionToHero({ id: "promo-1", store_id: "store-1", title: "عرض اليوم", image_url: image, discount_type: "percentage", discount_value: 20, starts_at: "2026-09-08T00:00:00Z", ends_at: "2026-09-10T00:00:00Z", is_active: true, created_at: "2026-09-09T00:00:00Z", stores: { name: "متجر جديد", status: "active" } });
equal(store?.source, "NEW_STORE", "new store converts");
equal(featuredStore?.source, "FEATURED_STORE", "featured store converts");
equal(product?.source, "NEW_PRODUCT", "new product converts");
equal(promotion?.source, "PROMOTION", "active promotion converts");
equal(productToHero({ id: "inactive", store_id: "store-1", name: "غير متاح", image_url: image, created_at: "2026-09-09T00:00:00Z", status: "archived", is_available: false }, "NEW_PRODUCT"), null, "inactive product excluded");
equal(promotionToHero({ id: "expired", store_id: "store-1", title: "منتهي", image_url: image, discount_type: "percentage", discount_value: 20, starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-09-02T00:00:00Z", is_active: true, created_at: "2026-09-01T00:00:00Z", stores: { name: "متجر جديد", status: "active" } }), null, "expired promotion excluded");
equal(promotionToHero({ id: "future", store_id: "store-1", title: "مستقبلي", image_url: image, discount_type: "percentage", discount_value: 20, starts_at: "2099-09-01T00:00:00Z", ends_at: "2099-09-02T00:00:00Z", is_active: true, created_at: "2026-09-09T00:00:00Z", stores: { name: "متجر جديد", status: "active" } }), null, "future promotion excluded");

const ranked = rankAndDeduplicateHeroSlides({ founder: [], newStores: [store!], featuredStores: [store!, featuredStore!], newProducts: [product!], featuredProducts: [], promotions: [promotion!] }, Date.parse("2026-09-09T12:00:00Z"));
equal(ranked.filter((item) => item.entityId === "store-1").length, 1, "duplicate entity is deduplicated");
equal(ranked[0]?.source, "FEATURED_STORE", "featured source outranks new source");
const empty = rankAndDeduplicateHeroSlides({ founder: [], newStores: [], featuredStores: [], newProducts: [], featuredProducts: [], promotions: [] });
equal(empty.length, 0, "all empty sources return empty without crashing");

equal(shouldRunHeroAutoplay({ active: true, appStateActive: true, slideCount: 3 }), true, "autoplay starts for active multi-slide Hero");
equal(shouldRunHeroAutoplay({ active: false, appStateActive: true, slideCount: 3 }), false, "inactive screen stops autoplay");
equal(shouldRunHeroAutoplay({ active: true, appStateActive: false, slideCount: 3 }), false, "background AppState stops autoplay");
equal(shouldRunHeroAutoplay({ active: true, appStateActive: true, slideCount: 1 }), false, "single slide does not loop");
equal(shouldRunHeroAutoplay({ active: true, appStateActive: true, slideCount: 0 }), false, "empty slides do not start timer");
equal(nextHeroIndex(2, 3), 0, "autoplay wraps to first slide");
equal(clampHeroIndex(9, 3), 2, "index is clamped after refresh");
equal(HERO_AUTOPLAY_INTERVAL >= 5_000, true, "autoplay interval is user-paced");
equal(shouldRefreshHero(0, 100), true, "first Market activation refreshes Hero");
equal(shouldRefreshHero(100, 100 + HERO_REFRESH_MIN_INTERVAL - 1), false, "refresh throttle avoids duplicate focus request");
equal(shouldRefreshHero(100, 100 + HERO_REFRESH_MIN_INTERVAL), true, "refresh resumes after minimum interval");

const diversitySlides = rankAndDeduplicateHeroSlides({
  founder: [{ ...slide, id: "founder-1", source: "FOUNDER", entityId: "founder-1", priority: 1, createdAt: "2026-09-09T00:00:00Z" }],
  featuredStores: [featuredStore!],
  newProducts: [product!],
  newStores: [store!],
  featuredProducts: [],
  promotions: [promotion!],
}, Date.parse("2026-09-09T12:00:00Z"));
equal(new Set(diversitySlides.slice(0, 5).map((item) => item.source)).size >= 4, true, "nearby priorities preserve source diversity");
equal(normalizeHeroSlide({ id: "founder-updated", content_type: "promotion", title: "عنوان محدث", target_id: "store-1", priority: 99, is_active: true }).title, "عنوان محدث", "Founder update is reflected by shared normalization");

void Promise.all([
  safeHeroSource(async () => { throw new Error("stores unavailable"); }, [] as string[]),
  safeHeroSource(async () => ["products-survive"], [] as string[]),
]).then(([failedSource, survivingSource]) => {
  equal(failedSource.length, 0, "failed source becomes empty candidates");
  equal(survivingSource.length, 1, "other source survives independently");
  console.log("=== Market Hero Tests ===");
  console.log(`=== Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
});
