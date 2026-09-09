# Soug-XPRESS Market Hero Slider Rebuild Report

**Date:** 2026-09-09  
**Status:** Implemented locally for review; intentionally uncommitted and not pushed.  
**Rollback branch:** `checkpoint/hero-slider-rebuild-2026-09-09`  
**Rollback commit:** `1d7346a8b9206d8d0eb387500d3580998ad11c00` (`fix(market): temporarily disable hero slider`)

## Summary

The legacy Hero/Market Slider was rebuilt as an isolated, mobile-first, RTL-aware feature using React Native `FlatList`. The implementation does not use `react-native-reanimated-carousel`, `GestureDetector`, Reanimated shared values, parallax, zoom, autoplay, or infinite animation loops.

The Market screen receives one isolated Hero component and one isolated data hook. Existing categories, search, stores, products, cards, horizontal lists, header, footer, and diagnostics were preserved. If the Hero query fails or returns no rows, only the Hero disappears; the rest of Market remains available.

The Founder management screen was rebuilt around the same normalized model and service. It supports creating, editing, image upload, type selection, CTA, target selection, priority, active/inactive state, date windows, phone preview, duplicate, and delete.

## Reference findings applied

The implementation was informed by the requested references without copying their code or design:

- [React Native FlatList](https://reactnative.dev/docs/flatlist): horizontal layout, stable IDs, fixed `getItemLayout`, separator-aware offsets, and shallow-update awareness.
- [Preline Hero Sliders](https://preline.co/blocks/marketing/hero-sliders/): rounded media frame, clear hierarchy, concise copy, one primary CTA, and visible pagination/control intent.
- [GoodCart](https://www.goodcart.design/): mobile-first hierarchy and responsive visual merchandising were treated as inspiration rather than a component source.
- [Lista Stores](https://listastores.com/en): local marketplace emphasis, store/product attribution, reachable product shelves, and mixed Arabic/Latin content considerations.

Because the React Native reference does not define a complete RTL carousel contract, RTL direction remains a device-testing requirement. The implementation uses `inverted={isRTL}` and a stable fixed item geometry, but the actual gesture direction, indicator order, and accessibility order must still be checked on physical Android and iOS devices.

## Architecture

```text
Founder Dashboard
        |
        v
marketHero.service.ts
        |
        v
hero.types.ts + hero.utils.ts
        |
        v
useMarketHeroSlides.ts
        |
        v
MarketHeroSlider.tsx
        |
        v
Market Home (single isolated insertion)
```

The boundaries are:

| Layer | Responsibility |
|---|---|
| `hero.types.ts` | Normalized extensible UI model and draft model. |
| `hero.utils.ts` | Database-row normalization, target encoding, and safe URL/screen validation. |
| `hero.demo.ts` | Three local demo slides for isolated tests and future component preview work. No fake fallback is shown when production data is empty. |
| `marketHero.service.ts` | Supabase adapter and Founder CRUD/upload operations. The UI does not consume database rows directly. |
| `useMarketHeroSlides.ts` | Market-only loading/error containment and lifecycle-safe async state. |
| `MarketHeroSlider.tsx` | Memoized renderer, horizontal FlatList, fixed geometry, manual swipe, pagination, and empty-state behavior. |
| `founder/hero-slides.tsx` | Founder CRUD form, preview, duplicate/delete actions, image upload, and target controls. |
| `home.tsx` | One Hero component mount and one safe navigation callback; existing Market data/rendering remains outside the Hero state. |

## Data model

The normalized model is:

```ts
type HeroSlideType = "STORE" | "PRODUCT" | "PROMOTION" | "APP" | "CUSTOM";
type HeroTargetType = "STORE" | "PRODUCT" | "CATEGORY" | "SCREEN" | "URL";
```

Each `HeroSlide` carries stable identity, image, optional title/description/CTA, target metadata, priority, active state, start/end dates, and timestamps. The service maps the existing `market_hero_slides` table into this model, preserving compatibility with the current database and avoiding a new migration during this protected first implementation.

Target encodings are validated at the navigation boundary:

- Store and Product targets require a non-empty ID.
- Screen targets are limited to an allowlist of known safe routes.
- External URLs must use `https://`.
- Invalid or incomplete targets are ignored without throwing or navigating to an undefined route.

## Market protection

The Market integration is intentionally small:

1. `useMarketHeroSlides()` runs independently from the existing category/store/product effects.
2. Query failure sets only Hero slides to an empty array and records a local error.
3. `MarketHeroSlider` returns `null` for an empty array.
4. The Hero renderer is wrapped with `React.memo` and uses only its own slide data, theme, direction, and callback props.
5. The existing `ScrollView` and all existing Market sections remain in place.
6. No Market store/product/category state was moved into the Hero component.
7. The only `home.tsx` rendering insertion is immediately after the existing Brand + Search row.
8. No autoplay or timer exists, so the rebuild cannot create a delayed state-update loop.

## Founder management

The rebuilt Founder screen provides a deliberately compact first version:

- Create and edit slides.
- Upload and replace an image using the existing Supabase `store_images` bucket.
- Choose content type: Promotion, Store, Product, App, or Custom.
- Choose target kind: Store, Product, Category, Screen, URL, or no target.
- Enter target ID/path safely.
- Edit title, description, CTA, priority, active state, and ISO date windows.
- Preview the actual Hero renderer on the management screen.
- Duplicate an existing slide as inactive.
- Delete a slide with confirmation.
- Access the screen from both Founder quick actions and module navigation.

The first version intentionally uses a compact target-kind plus target-value control rather than adding broad Store/Product/Category lookup queries to the Founder screen. This keeps the management surface isolated and avoids touching Store, Product, or Category screens. A later iteration can add searchable selectors without changing the Hero renderer or normalized model.

## Files created

- `apps/mobile/src/components/market/hero/hero.types.ts`
- `apps/mobile/src/components/market/hero/hero.demo.ts`
- `apps/mobile/src/components/market/hero/hero.utils.ts`
- `apps/mobile/src/components/market/hero/MarketHeroSlider.tsx`
- `apps/mobile/src/hooks/useMarketHeroSlides.ts`
- `apps/mobile/src/services/marketHero.service.ts`
- `apps/mobile/src/app/founder/hero-slides.tsx`
- `apps/mobile/tests/market-hero.test.ts`
- `docs/validation/MARKET_HERO_SLIDER_REBUILD_REPORT_2026-09-09.md`

## Files modified

- `apps/mobile/src/app/(tabs)/home.tsx`: one isolated Hero import, hook, safe navigation callback, and renderer mount; existing Market code remains intact.
- `apps/mobile/src/app/founder/index.tsx`: new Hero management entries in existing Founder navigation areas.
- `apps/mobile/src/app/founder/market-settings.tsx`: preserved shared Market section settings import boundary.
- `apps/mobile/src/constants/brand.ts`: legacy slider-only banner exports remain removed.
- `scripts/test.cjs`: new Hero utility test registered; existing tests remain.
- `apps/mobile/package.json` and `pnpm-lock.yaml`: legacy carousel dependency remains removed.
- `apps/mobile/src/services/market-section.service.ts`: preserved shared Market section settings extracted from the removed legacy service.
- Historical legacy-slider files/assets remain deleted from the prior cleanup phase and are not reintroduced.

The Founder layout already had the `hero-slides` route at the rollback baseline, so restoring the new screen did not create a net route diff relative to that baseline.

## Validation

| Check | Result |
|---|---|
| `git diff --check` | **PASS** |
| `pnpm exec tsc --noEmit` from `apps/mobile` | **PASS** |
| `node scripts/test.cjs` | **PASS** — existing resolver, Facebook URL, store-hours, store-rotation, and new Hero tests passed; 12 Hero assertions passed. |
| Forbidden technology scan | **PASS** — no `react-native-reanimated-carousel`, `GestureDetector`, Reanimated shared values, or complex animation APIs in the new implementation. |
| Static route/reference scan | **PASS** — Hero route/service/component references are connected; no undefined CTA route is generated by the new helper. |
| Android/iOS physical runtime test | **Not available in this environment** — no device/emulator runtime trace was performed. |
| Commit/push/build/APK/OTA/deployment | **None performed** |

## Risks and next runtime checks

The principal remaining risk is platform behavior that static validation cannot prove: Android/iOS RTL FlatList direction, initial slide position, pagination order, image loading performance, accessibility announcements, and physical navigation behavior. The first device test should cover opening Market, loading/empty/error states, manual swipe in both directions, pagination, CTA navigation, returning to Market, long scrolling, and a slow/offline Hero query.

The existing Market diagnostic logs should be captured during that test. The key evidence is that Hero query failure or unmounting must not be accompanied by changes to `categories.length`, `allStores.length`, `products.length`, `filteredStores`, or `displayedStores`, and that the HomeScreen does not unmount unexpectedly.

## Final state

The working tree is intentionally uncommitted. No commit, push, build, APK, OTA, or deployment was performed. The safe rollback branch remains:

```text
checkpoint/hero-slider-rebuild-2026-09-09
-> 1d7346a8b9206d8d0eb387500d3580998ad11c00
```
