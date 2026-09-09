# Hero Autoplay and Smart Refresh Validation

**Baseline:** `af637c3f50e6995d02095c93a2a5b4220a4d627f`
**Rollback:** `checkpoint/hero-slider-rebuild-2026-09-09` → `1d7346a8b9206d8d0eb387500d3580998ad11c00`
**Commit/push:** Not performed.

## Results

| Area | Result |
|---|---|
| Autoplay | **PASS — static and deterministic validation** |
| Smart Refresh | **PASS — focus and AppState foreground refresh, no polling** |
| Founder ↔ Market Sync | **PASS — shared service/model and live dashboard aggregation** |
| Founder Preview = Market UI | **PASS — both use `MarketHeroSlider`** |
| New Stores | **PASS — existing real source retained** |
| New Products | **PASS — existing real source retained** |
| Featured Stores | **PASS — existing real source retained** |
| Promotions | **PASS — active date-bounded source retained** |
| Featured Products | **NOT AVAILABLE — no source created** |
| RTL | **PASS by existing shared renderer/static review; Android runtime unavailable here** |
| Timer Cleanup | **PASS — timeout cleared on unmount, inactivity, AppState background, and swipe start** |
| Failure Isolation | **PASS — source failures produce empty Hero candidates without resetting Market** |
| TypeScript | **PASS** |
| Tests | **39 passed / 0 failed** |

## Implemented behavior

Autoplay uses a configurable `HERO_AUTOPLAY_INTERVAL` of 7 seconds and React Native `setTimeout` only. It does not use Reanimated, GestureDetector, a carousel library, parallax, zoom, or infinite animation.

The timer runs only when the Hero is active, the app is in the foreground, and there is more than one slide. It is cleared on unmount, background AppState, inactive screen state, empty data, single-slide data, and manual swipe start. Manual interaction causes the normal schedule to restart after momentum settles.

Smart Refresh runs when Market receives focus and when the app returns to the foreground. A short 1.5-second guard prevents duplicate focus/foreground requests. There is no fast polling loop. Stale async results are ignored.

Founder Dashboard now loads the same live aggregation used by Market. Founder-managed slides remain editable. Automatic slides are shown with their real source and `AUTO` status and are not editable, duplicated, or deleted as manual slides. The source labels include `FOUNDER`, `NEW_STORE`, `FEATURED_STORE`, `NEW_PRODUCT`, `PROMOTION`, and the reserved unavailable `FEATURED_PRODUCT` source.

## Automated coverage

The Hero suite now covers:

- Autoplay start conditions.
- Inactive screen and background AppState stop conditions.
- Empty and single-slide no-loop behavior.
- Index wrap and clamping after refresh.
- Configured user-paced interval.
- Refresh throttle and resume behavior.
- Source diversity under nearby priorities.
- Founder update normalization.
- Deduplication and priority.
- New stores, featured stores, new products, and active promotions.
- Expired and future promotion exclusion.
- Source failure isolation.

## Runtime limitation

No Android device or emulator was available in Manus, so physical swipe, image loading, Android RTL rendering, and live Founder-to-Market interaction were not re-run here. No build, APK, OTA, EAS build, or deployment was performed.

## Files modified

- `apps/mobile/src/components/market/hero/MarketHeroSlider.tsx`
- `apps/mobile/src/components/market/hero/hero.autoplay.ts`
- `apps/mobile/src/components/market/hero/hero.refresh.ts`
- `apps/mobile/src/components/market/hero/hero.smart.ts`
- `apps/mobile/src/hooks/useMarketHeroSlides.ts`
- `apps/mobile/src/services/marketHero.service.ts`
- `apps/mobile/src/app/founder/hero-slides.tsx`
- `apps/mobile/tests/market-hero.test.ts`
- This validation report.

## Final constraints

```text
Commit: NO
Push: NO
Build: NO
APK: NO
OTA: NO
Deployment: NO
```
