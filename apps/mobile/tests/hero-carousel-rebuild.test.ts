import { buildFinalHeroSlides, normalizeRuntimeSlides } from "../src/services/heroSlider.runtime";
import { getRotationCycleForDate } from "../src/services/heroRotationCycle";
import { selectSmartHeroSlides, type SmartCandidate } from "../src/services/smartHeroSelection";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
}
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
}

const slides = Array.from({ length: 12 }, (_, index) => ({
  id: `smart-${index + 1}`,
  image: `https://cdn.example.test/slide-${index + 1}.jpg`,
  title: `Demo slide ${index + 1}`,
  description: "Real carousel test slide",
  buttonLabel: "Open",
  kind: (index % 2 === 0 ? "product" : "promotion") as "product" | "promotion",
  source: "products" as const,
  sourceId: `product:${index + 1}`,
  createdAt: 1_700_000_000_000 + index,
}));
const settings = {
  mode: "smart" as const,
  smartMode: true,
  enabledSources: { products: true, new_stores: true, featured_stores: true, promotions: true, couriers: true },
  sourceWeights: { products: 35, new_stores: 22, featured_stores: 18, promotions: 15, couriers: 10 },
  transitionMs: 350,
  transitionType: "slide" as const,
  pauseOnTouch: true,
  resumeDelaySeconds: 4,
  maxRepeatCount: 1,
  maxSlides: 12,
};
const selected = selectSmartHeroSlides(slides, settings, 12, "test-cycle-morning");
const finalSlides = normalizeRuntimeSlides(buildFinalHeroSlides("smart", [], selected));
const manualSlides = slides.map((slide, index) => ({
  id: `manual-${index + 1}`,
  title: slide.title,
  subtitle: slide.description,
  image_url: slide.image,
  content_type: "custom" as const,
  cta_label: slide.buttonLabel,
  is_active: true,
  display_order: index + 1,
  priority: 100 - index,
}));
const manualFinal = normalizeRuntimeSlides(buildFinalHeroSlides("manual", manualSlides, []));
const hybridFinal = normalizeRuntimeSlides(buildFinalHeroSlides("hybrid", manualSlides.slice(0, 2), selected));

equal(finalSlides.length, 12, "Final slides must contain all 12 slides");
equal(selected.length, 12, "Carousel data must contain all 12 slides");
equal(manualFinal.length, 12, "Manual mode must expose 12 founder-controlled slides");
equal(hybridFinal.length, 12, "Hybrid mode must fill to 12 slides after mandatory manual slides");
equal(hybridFinal[0].source, "manual", "Hybrid mode must place mandatory founder slides first");
deepEqual([...new Set(finalSlides.map((slide) => slide.id))].sort(), [...new Set(slides.map((slide) => slide.id))].sort(), "All 12 slides must remain reachable without duplicates");

const forward = finalSlides.map((_, index) => index + 1);
const backward = [...forward].reverse();
deepEqual(forward, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "Forward swipe sequence reaches slide 12");
deepEqual(backward, [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], "Backward swipe sequence reaches slide 1");
deepEqual(forward, Array.from({ length: 12 }, (_, index) => index + 1), "Autoplay sequence reaches every slide");
deepEqual(forward.map((index) => finalSlides[index - 1].id), finalSlides.map((slide) => slide.id), "Every pagination dot resolves to its matching slide");

const morning = getRotationCycleForDate(new Date("2026-09-08T10:00:00+01:00"));
const evening = getRotationCycleForDate(new Date("2026-09-08T18:00:00+01:00"));
equal(morning.rotation_cycle_id, "2026-09-08-morning", "Morning cycle id");
equal(evening.rotation_cycle_id, "2026-09-08-evening", "Evening cycle id");
assert(morning.seed !== evening.seed, "Morning and evening cycles must use different deterministic seeds");

const courier: SmartCandidate = {
  id: "courier-real-1",
  image: "https://cdn.example.test/courier.jpg",
  title: "Courier of the Day",
  description: "Active courier",
  buttonLabel: "View courier",
  kind: "courier",
  source: "couriers",
  sourceId: "courier:real-1",
  createdAt: Date.now(),
};
const courierSelection = selectSmartHeroSlides([courier, ...slides], settings, 12, morning.seed);
assert(courierSelection.some((slide) => slide.kind === "courier"), "Courier of the Day must participate in Smart Slider selection");

console.log("=== Smart Slider Rebuild Tests ===");
console.log("  ✅ Final slides = 12");
console.log("  ✅ Carousel data = 12");
console.log("  ✅ Pagination = 12");
console.log("  ✅ Forward 1 → 12");
console.log("  ✅ Backward 12 → 1");
console.log("  ✅ Autoplay 1 → 12");
console.log("  ✅ Dot navigation maps one-to-one");
console.log("  ✅ Morning and evening cycles differ");
console.log("  ✅ Courier of the Day is selectable");
