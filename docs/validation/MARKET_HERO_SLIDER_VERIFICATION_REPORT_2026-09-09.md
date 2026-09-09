# Market Hero Slider Verification Report

**Date:** 2026-09-09  
**Verification scope:** Smart Content connection, Market isolation, Founder management, and Android runtime availability.  
**No commit, push, build, APK, OTA, or deployment was performed.**

## Final determination

**Smart Hero status: ARCHITECTURE READY BUT NOT CONNECTED.**

The current `marketHero.service.ts` reads only from `market_hero_slides`. The current `useMarketHeroSlides.ts` calls only `getMarketHeroSlides()`. There is no implementation that queries or combines:

- New stores.
- Featured stores.
- New products.
- Featured products.
- Active promotions.
- Founder slides as one input alongside those smart sources.

The current service sorts existing Founder/DB slides by `priority` and `display_order`, but it does not perform the requested multi-source filter, ranking, deduplication, and final `HeroSlide[]` aggregation. Therefore Smart Hero must **not** be considered complete.

No arrays were added to fake Smart Hero behavior during this verification phase.

## Smart Hero

| Requirement | Status | Evidence |
|---|---|---|
| Founder slides | **PASS** | `getFounderHeroSlides()` and `getMarketHeroSlides()` normalize rows from `market_hero_slides`. |
| New stores | **FAIL** | No query or adapter exists in `marketHero.service.ts`. |
| Featured stores | **FAIL** | No query or adapter exists in `marketHero.service.ts`. |
| New products | **FAIL** | No query or adapter exists in `marketHero.service.ts`. |
| Featured products | **FAIL** | No query or adapter exists in `marketHero.service.ts`. |
| Promotions | **FAIL** | No active-promotions query or adapter exists. |
| Deduplication | **FAIL** | No cross-source deduplication pipeline exists. |
| Priority/ranking | **FAIL** for Smart aggregation | Existing DB ordering supports Founder rows only; there is no cross-source ranking. |
| Final `HeroSlide[]` aggregation | **FAIL** | The hook receives only the single DB-slide result. |

Required future pipeline remains:

```text
Founder Slides
+ Featured Stores
+ New Stores
+ Featured Products
+ New Products
+ Active Promotions
        ↓
filter
        ↓
priority/ranking
        ↓
deduplication
        ↓
HeroSlide[]
        ↓
MarketHeroSlider
```

## Market static isolation review

The code-level isolation is sound:

- `useMarketHeroSlides()` owns only Hero loading/error state.
- Query failure returns `slides: []` and the component returns `null`.
- `MarketHeroSlider` is memoized and receives only `slides`, `colors`, `isRTL`, and an optional callback.
- Store, product, category, search, and header state remain in `home.tsx` and are not passed into the Hero state.
- No Hero timer, autoplay, Reanimated value, Gesture Handler, or infinite loop exists.
- The existing Market `ScrollView` and sections remain in place.

This is a **static code result**, not a device result.

## Market runtime matrix

No Android runtime test could be executed because the environment has no `adb`, emulator, or `avdmanager`, and no connected Android device was available. The package contains only the existing Expo scripts; no build or runtime server was started under this request.

| Market check | Status | Reason |
|---|---|---|
| Open | **FAIL — not runtime verified** | No Android device/emulator available. |
| Hero appears | **FAIL — not runtime verified** | No Android device/emulator available. |
| Swipe left | **FAIL — not runtime verified** | No Android device/emulator available. |
| Swipe right | **FAIL — not runtime verified** | No Android device/emulator available. |
| Pagination | **FAIL — not runtime verified** | No Android device/emulator available. |
| CTA | **FAIL — not runtime verified** | No Android device/emulator available. |
| Back navigation | **FAIL — not runtime verified** | No Android device/emulator available. |
| Long Market scroll | **FAIL — not runtime verified** | No Android device/emulator available. |
| Store sections | **FAIL — not runtime verified** | No Android device/emulator available. |
| Product sections | **FAIL — not runtime verified** | No Android device/emulator available. |
| Categories | **FAIL — not runtime verified** | No Android device/emulator available. |
| Search/Header | **FAIL — not runtime verified** | No Android device/emulator available. |
| Re-open Market | **FAIL — not runtime verified** | No Android device/emulator available. |
| RTL | **FAIL — not runtime verified** | `inverted={isRTL}` is present, but physical gesture/order behavior is unproven. |
| No Hero data | **PASS — static code path** | Empty data returns `null`; the Market parent remains mounted. |
| Hero loading error | **PASS — static code path** | Hook catches the error, clears only Hero slides, and the component hides itself. |
| Invalid Hero target | **PASS — static code path** | Store/Product require IDs; Screen routes are allowlisted; URLs require HTTPS; invalid targets are ignored. |
| Slow image | **FAIL — not runtime verified** | Image loading behavior was not observed on a device. |
| Failure isolation | **PASS — static code review** | No Hero state setter is connected to stores, products, categories, search, or header state. Runtime confirmation remains pending. |

## Unnecessary-render review

**Static result: PASS.** Hero data is isolated in `useMarketHeroSlides`, and the renderer is `React.memo`. The Hero does not receive store/product/category/search state. Existing Market sections are not children of the Hero component and are not rebuilt by Hero state updates in the source structure.

**Runtime result: NOT VERIFIED.** React render counters or Android profiler traces were not available because no device/emulator was connected.

## Founder verification

The source supports the requested Founder operations through `marketHero.service.ts` and `founder/hero-slides.tsx`:

| Founder check | Status | Evidence |
|---|---|---|
| Create | **PASS — static** | `saveFounderHeroSlide(draft)` inserts a row. |
| Edit | **PASS — static** | `saveFounderHeroSlide(draft, id)` updates a row. |
| Duplicate | **PASS — static** | `duplicateFounderHeroSlide()` creates an inactive copy. |
| Preview | **PASS — static** | Founder preview renders the exact `MarketHeroSlider` component. |
| Active/Inactive | **PASS — static** | `isActive` is edited and persisted. |
| Priority | **PASS — static** | Priority is edited and persisted to priority/display order. |
| Delete | **PASS — static** | Delete is confirmed and calls the service. |
| CTA target | **PASS — static** | Store, Product, Category, Screen, URL, and empty target modes are represented; Market navigation validates targets. |
| Scheduling | **PASS — static** | Start/end ISO fields map to `start_at`/`end_at`; actual RLS/time-window behavior is not device-tested. |
| Founder runtime interaction | **FAIL — not runtime verified** | No device/browser interaction was available under the no-build/no-runtime constraint. |

## Automated checks

| Check | Result |
|---|---|
| TypeScript: `pnpm exec tsc --noEmit` | **PASS** |
| Tests: `node scripts/test.cjs` | **PASS** — existing tests and 13 Hero assertions passed. |
| `git diff --check` | **PASS** |
| Forbidden technology scan | **PASS** — no Reanimated carousel, GestureDetector, or complex animation APIs found in the new Hero path. |
| Android runtime | **FAIL — unavailable** |

## Problem status and recommended next step

There is no runtime crash or Market regression to diagnose from this environment. The blocking findings are:

1. **Smart Hero is not connected to real smart sources.** This is a completeness gap in `marketHero.service.ts`, not a Market rendering failure.
2. **Android runtime verification cannot be performed here** because `adb` and an emulator/device are absent.
3. **Physical RTL and gesture semantics remain unproven.**

No speculative fix was applied. The rollback remains:

```text
checkpoint/hero-slider-rebuild-2026-09-09
1d7346a8b9206d8d0eb387500d3580998ad11c00
```

## Final required state

```text
Commit: NO
Push: NO
Build: NO
OTA: NO
```

The phase is **not complete** until Smart Content is connected to real project data and the Market/Founder flows are exercised on a physical Android device or emulator.
