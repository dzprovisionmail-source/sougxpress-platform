# Legacy Hero/Market Slider Cleanup Report

**Date:** 2026-09-09  
**Rollback baseline:** `1d7346a8b9206d8d0eb387500d3580998ad11c00` (`fix(market): temporarily disable hero slider`)  
**Scope:** Legacy Hero/Market Slider cleanup only. No new Slider was added. No commit, push, build, APK, OTA, or deployment was performed.

## Result

The legacy Hero/Market Slider implementation was removed from the mobile application after proving that its runtime code, Founder management screen, supporting services, static banner assets, test, and carousel dependency were used exclusively by that system.

The existing Market section visibility settings were preserved. Because they are shared Market behavior rather than Slider behavior, their implementation was moved from the legacy `heroSlider.service.ts` into the new `market-section.service.ts` without changing their Supabase keys or behavior.

## Files deleted

| File | Reason deletion was proven safe |
|---|---|
| `apps/mobile/src/app/founder/hero-slides.tsx` | Dedicated Founder management screen; only referenced by its Founder route and two Founder dashboard menu entries. |
| `apps/mobile/src/services/heroSlider.service.ts` | All Slider APIs and types were exclusive to the deleted Market/Founder Slider. The three shared Market section settings functions were preserved in `market-section.service.ts`. |
| `apps/mobile/src/services/heroSlider.runtime.ts` | Runtime Slider normalization/build functions; referenced only by the deleted Market implementation, deleted Founder Slider screen, and deleted Slider test. |
| `apps/mobile/src/services/smartHeroSlider.service.ts` | Smart Slider data selection/fetching; referenced only by the deleted Market implementation, deleted Founder Slider screen, and deleted Smart selection service. |
| `apps/mobile/src/services/smartHeroSelection.ts` | Smart Slider ranking/selection; referenced only by the deleted Smart Slider service and deleted Slider test. |
| `apps/mobile/src/services/heroRotationCycle.ts` | Slider-specific AsyncStorage rotation cycle and courier-of-the-day state; referenced only by deleted Slider runtime, Smart Slider service, Founder Slider screen, and Market implementation. |
| `apps/mobile/tests/hero-carousel-rebuild.test.ts` | Tests only the deleted Slider runtime, Smart selection, and rotation-cycle modules. Its entry was also removed from `scripts/test.cjs`. |
| `apps/mobile/assets/brand/banner_fresh.png` | Referenced only by the deleted HomeScreen fallback Slider template and deleted Smart Slider service. |
| `apps/mobile/assets/brand/banner_bakery.png` | Referenced only by the deleted HomeScreen fallback Slider template and deleted Smart Slider service. |
| `apps/mobile/assets/brand/banner_delivery.png` | Referenced only by the deleted HomeScreen fallback Slider template and deleted Smart Slider service. |

## Files modified

| File | Change |
|---|---|
| `apps/mobile/src/app/(tabs)/home.tsx` | Removed the legacy Hero data state, fetch/effect chain, fallback templates, animation/autoplay handlers, slide renderer, Slider JSX, and Slider-only styles. The Market section settings query and existing Marketplace content remain. The existing Market diagnostics remain. |
| `apps/mobile/src/app/founder/_layout.tsx` | Removed the dedicated `hero-slides` Stack route. |
| `apps/mobile/src/app/founder/index.tsx` | Removed the two dedicated “إدارة Slider السوق” dashboard navigation entries and the now-unused `Megaphone` import. |
| `apps/mobile/src/app/founder/market-settings.tsx` | Changed only the import source for shared Market section settings from the deleted legacy service to `market-section.service.ts`. The screen and behavior remain. |
| `apps/mobile/src/constants/brand.ts` | Removed the three Slider-only banner exports. Other brand constants remain unchanged. |
| `apps/mobile/package.json` | Removed the exclusively used `react-native-reanimated-carousel` dependency. |
| `pnpm-lock.yaml` | Removed the lockfile importer/package/snapshot entries for `react-native-reanimated-carousel`. |
| `scripts/test.cjs` | Removed only the deleted `hero-carousel-rebuild.test.ts` test entry. Remaining tests are unchanged. |

## New preserved shared service

`apps/mobile/src/services/market-section.service.ts` now contains only:

- `MarketSectionSettings`
- `getMarketSectionSettings`
- `updateMarketSectionSettings`

This preserves the existing `platform_financial_settings` keys:

- `market_show_special_offers`
- `market_show_new_stores`
- `market_show_all_stores`

No query, key, table, or write behavior was changed.

## Database and migrations not deleted

The following historical Supabase migrations were **not deleted or modified**:

- `supabase/migrations/20260812100000_hero_sliders.sql`
- `supabase/migrations/20260812200000_hero_slider_targets.sql`
- `supabase/migrations/20260907140000_seed_smart_hero_slider_settings.sql`
- `supabase/migrations/20260907150000_seed_smart_hero_behavior_settings.sql`
- `supabase/migrations/20260907151000_add_hero_slide_timing.sql`

Although these migrations are Slider-specific, they are historical migration history and deleting them would not safely remove already-applied production schema/data. No destructive database migration was requested or created. The `market_hero_slides` table, its policies, target columns, indexes, and legacy `hero_*` platform settings remain in the database for a later, explicitly approved data/schema cleanup phase.

## Dependency not deleted

The following dependencies were retained because they are not exclusive to the legacy Slider:

- `react-native-reanimated`: retained because it is a general application animation dependency and may be used outside the removed Slider.
- `react-native-gesture-handler`: retained because it is used by the application root and other interaction surfaces.
- `react-native-safe-area-context`, Expo image modules, and other general mobile dependencies: retained because they are used by unrelated screens.

Only `react-native-reanimated-carousel` was removed; static reference scanning showed it was used only by the deleted HomeScreen and Founder Slider screen.

## Dead-reference checks

Application source, tests, package manifests, and lockfile were searched for removed Slider imports, symbols, routes, and dependency names. No active references remain outside the historical Supabase migrations listed above.

Two repository documentation snapshots still contain historical text referring to the old Slider:

- `PROJECT_HISTORY_AND_SYSTEM_MAP.md` mentions “hero slides” and `heroSlider.service.ts` in a historical feature map.
- `finance_commission_inventory_raw.txt` contains an old captured path from a prior inventory.

They do not participate in the application build or runtime and were not modified as part of this source cleanup.

The file `apps/mobile/home.tsx.gesture-backup` was not present in this checkout and was not touched, deleted, or added.

## Validation

| Check | Result |
|---|---|
| `git diff --check` | **PASS** |
| `pnpm exec tsc --noEmit` from `apps/mobile` | **PASS** |
| `node scripts/test.cjs` | **PASS** — remaining resolver, Facebook URL, store-hours, and store-rotation tests passed |
| Legacy active-reference scan | **PASS** outside intentionally preserved historical Supabase migrations and non-runtime documentation snapshots |
| New Slider added | **No** |
| Commit/push/build/OTA/deployment | **None performed** |

## Final working-tree state

The working tree contains the cleanup changes and the report, and is intentionally uncommitted for review. The rollback commit `1d7346a` remains unchanged.
