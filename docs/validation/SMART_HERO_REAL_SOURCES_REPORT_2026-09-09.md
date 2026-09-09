# Smart Hero Real Sources Integration Report

**Date:** 2026-09-09  
**Scope:** Connect the Hero Engine to confirmed Soug-XPRESS data sources without changing database schema or rewriting Market UI.  
**Rollback:** `checkpoint/hero-slider-rebuild-2026-09-09` → `1d7346a8b9206d8d0eb387500d3580998ad11c00`

## REAL SOURCES

| Source | Status | Confirmed contract |
|---|---|---|
| New stores | **CONNECTED** | `stores.status = 'active'`, `stores.is_new = true`, ordered by `created_at DESC`, limited, and requires `cover_url` or `logo_url`. |
| Featured stores | **CONNECTED** | `stores.status = 'active'`, `stores.is_featured = true`, ordered by `rating DESC`, limited, and requires a usable image. The `is_featured` column is confirmed by the existing migration and Store type. |
| New products | **CONNECTED** | `products.status = 'active'`, `is_available = true`, non-null `image_url`, ordered by `created_at DESC`, limited, with the existing `stores(name)` relationship. |
| Featured products | **NOT AVAILABLE** | The confirmed Product type, migration, and existing services contain no featured-product field or service. No new Featured Product system was invented. The source returns no candidates. |
| Promotions | **CONNECTED** | Existing merchant promotion source is `store_promotions`, not a newly invented table. It filters `is_active = true`, `starts_at <= now`, `ends_at >= now`, limits results, and uses existing store image fallback. |
| Founder slides | **CONNECTED** | Existing `market_hero_slides` rows are normalized and included in the Smart aggregation. Founder management still reads inactive/scheduled rows for editing. |

No migration, schema change, backend change, or new table was created.

## Smart aggregation

The production path is now:

```text
Founder slides
+ New stores
+ Featured stores
+ New products
+ Featured products when a real source exists
+ Active store promotions
        ↓
per-source limits
        ↓
per-source image/status/date filters
        ↓
source metadata normalization
        ↓
entity deduplication
        ↓
source priority + Founder priority + freshness
        ↓
final limit of 12
        ↓
MarketHeroSlider
```

**Smart aggregation: PASS** for all confirmed real sources. The unavailable Featured Products source is explicitly empty rather than fabricated.

## Ranking and deduplication

The unified model now includes:

```ts
type HeroSlideSource =
  | "FOUNDER"
  | "NEW_STORE"
  | "FEATURED_STORE"
  | "NEW_PRODUCT"
  | "FEATURED_PRODUCT"
  | "PROMOTION";
```

Ranking configuration is independent from UI:

```ts
HERO_SOURCE_PRIORITY = {
  FOUNDER: 600,
  FEATURED_STORE: 500,
  FEATURED_PRODUCT: 500,
  PROMOTION: 450,
  NEW_STORE: 300,
  NEW_PRODUCT: 300,
};
```

The values are centralized and adjustable; they are not embedded in the renderer. Final score combines source priority, slide priority, and freshness.

Per-source limits are also centralized:

```ts
FOUNDER: 6
FEATURED_STORE: 4
FEATURED_PRODUCT: 4
PROMOTION: 4
NEW_STORE: 4
NEW_PRODUCT: 4
```

The final Hero result is limited to 12 slides.

Deduplication uses:

```text
slide.type + slide.entityId
```

Therefore the same store appearing as both Featured and New Store is retained only once, with the higher-ranked candidate selected.

| Smart check | Result |
|---|---|
| Smart aggregation | **PASS** |
| Ranking | **PASS** |
| Deduplication | **PASS** |
| Priority configuration separate from UI | **PASS** |
| Per-source limits | **PASS** |
| Founder priority preservation | **PASS** |
| Founder slides empty while smart sources exist | **PASS by architecture** |
| One source fails while others survive | **PASS** |
| All sources empty returns `[]` | **PASS** |

## Failure isolation

Each source loader is wrapped independently. A stores, products, Founder, or promotions query failure becomes an empty candidate list for that source only. Other sources continue to aggregate, rank, deduplicate, and render.

The pure engine exposes and tests this behavior directly. The existing Market store/product/category/search/header state is not passed into the Smart Hero state and is not reset by a Hero source failure.

## Tests

New Smart Hero tests cover:

- New store conversion.
- Featured store conversion.
- New product conversion.
- Active promotion conversion.
- Founder source preservation.
- Inactive product exclusion.
- Expired promotion exclusion.
- Future promotion exclusion.
- Duplicate entity deduplication.
- Featured-vs-new priority ordering.
- One-source failure isolation.
- All sources empty without crash.
- Safe target handling.
- Three-slide local fixture presence.

Results:

```text
TypeScript: PASS
Tests: PASS
Hero tests: 26 passed / 0 failed
Diff check: PASS
Forbidden animation technology scan: PASS
```

## Market UI changes

**Market UI changed: YES, minimally.** The only additional `home.tsx` behavior in this phase is a safe Category CTA route branch. No StoreCard, ProductCard, category UI, search UI, header, Market sections, or layout was rewritten.

The Smart logic is isolated in:

- `apps/mobile/src/components/market/hero/hero.smart.ts`
- `apps/mobile/src/components/market/hero/hero.types.ts`
- `apps/mobile/src/components/market/hero/hero.utils.ts`
- `apps/mobile/src/services/marketHero.service.ts`
- `apps/mobile/src/hooks/useMarketHeroSlides.ts`

## Runtime limitation

No Android runtime test was possible because this environment has no `adb`, emulator, `avdmanager`, or connected device. No build or runtime server was started. Physical Market and RTL behavior remain pending device verification.

## Final protected state

```text
Commit: NO
Push: NO
Build: NO
APK: NO
OTA: NO
Deployment: NO
```

The rollback branch and commit remain unchanged:

```text
checkpoint/hero-slider-rebuild-2026-09-09
1d7346a8b9206d8d0eb387500d3580998ad11c00
```
