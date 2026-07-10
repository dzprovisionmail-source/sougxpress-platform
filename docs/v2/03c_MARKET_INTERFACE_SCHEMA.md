# 03c — Market Interface Schema

## Status

Documentation Phase Only. This document defines the client-facing contracts (shapes consumed by `apps/mobile` screens) that sit on top of the tables defined in `03_DATABASE_SCHEMA.md` and `03b_DATABASE_SCHEMA_ADDENDUM.md`. It does not introduce new persisted tables; it defines read/query interfaces, enums shared across the app, and the category taxonomy for the marketplace. No SQL has been executed; no Supabase project has been modified.

## Purpose

TypeScript types in `apps/mobile` for anything a screen renders (a store card, a product listing, an order summary, a driver's active delivery) must map to a shape defined here, not be invented ad hoc per screen. This keeps every module (Founder OS, and future customer/merchant/driver modules) reading a consistent, documented contract.

---

## 1. Shared Enums

These enums are referenced by table `status` columns in `03_DATABASE_SCHEMA.md` and must be kept in sync with that document; this file is the canonical list for client-side type definitions.

- `ZoneStatus`: `active` | `inactive` | `planned`
- `MerchantStatus`: `pending_review` | `active` | `suspended` | `rejected`
- `StoreStatus`: `draft` | `active` | `paused` | `suspended`
- `ProductStatus`: `active` | `out_of_stock` | `archived`
- `OrderStatus`: `pending` | `accepted` | `preparing` | `ready_for_pickup` | `picked_up` | `delivered` | `cancelled` | `disputed`
- `DriverStatus`: `pending_review` | `active` | `suspended` | `offline`
- `DriverAvailability`: `online` | `offline` | `on_delivery`
- `PayoutStatus`: `pending` | `processing` | `paid` | `failed`
- `PromotionScope`: `platform` | `zone` | `store`
- `DiscountType`: `percentage` | `fixed_amount` | `free_delivery`
- `DisputeStatus`: `open` | `investigating` | `resolved` | `rejected`
- `ActorRole`: `customer` | `merchant` | `driver` | `founder` | `system`

---

## 2. Store Category Taxonomy

`store_categories` (reference/lookup values — implemented as either a fixed enum or a lightweight lookup table at build time; not part of the core schema's mutable business tables)

| Value | Label |
|---|---|
| `grocery` | Grocery |
| `restaurant` | Restaurant |
| `pharmacy` | Pharmacy |
| `bakery` | Bakery |
| `butcher` | Butcher |
| `electronics` | Electronics |
| `household` | Household Goods |
| `other` | Other |

This taxonomy is intentionally minimal for the Ain Sefra launch. Adding a category is a documentation change to this table first, then a client update — never the reverse.

---

## 3. Founder Operating System — Read Interfaces

These are the composite, read-only shapes the Founder Operating System dashboard queries. Each is derived by joining tables from `03_DATABASE_SCHEMA.md` / `03b_DATABASE_SCHEMA_ADDENDUM.md`; none of them are new persisted tables.

### `FounderDashboardSummary`

| Field | Source | Notes |
|---|---|---|
| zone_id | zones.id | nullable = platform-wide |
| period | platform_metrics_snapshots.metric_period | |
| total_orders | platform_metrics_snapshots.total_orders | |
| total_gmv_minor | platform_metrics_snapshots.total_gmv_minor | |
| total_commission_minor | platform_metrics_snapshots.total_commission_minor | |
| active_merchants | platform_metrics_snapshots.active_merchants | |
| active_drivers | platform_metrics_snapshots.active_drivers | |
| open_disputes | derived count from disputes where status != resolved/rejected | |
| open_alerts | derived count from founder_alerts where status = open | |

### `FounderZoneOverview`

| Field | Source | Notes |
|---|---|---|
| zone | zones row | |
| merchant_count | count of merchants where zone_id matches | |
| store_count | count of stores where zone_id matches | |
| driver_count | count of drivers where zone_id matches | |
| active_order_count | count of orders where zone_id matches and status not in (delivered, cancelled) | |

### `FounderAlertItem`

Maps directly to a `founder_alerts` row (see `03b_DATABASE_SCHEMA_ADDENDUM.md`); exposed as-is to the client, no additional joins required.

### `FounderOverrideAction`

Client-side request shape for creating a `founder_overrides` row.

| Field | Notes |
|---|---|
| entity_type | required |
| entity_id | required |
| override_type | required |
| reason | required, non-empty |

The client never writes `previous_value`/`new_value`/`founder_id`/`created_at` directly — those are set server-side at write time.

---

## 4. Marketplace Browse/Query Interfaces

These are the shapes future customer/merchant/driver modules will consume once built. They are documented now so the Founder OS module's read patterns (and any shared query utilities) are established against the same contracts from day one.

### `StoreListItem`

| Field | Source |
|---|---|
| id | stores.id |
| name | stores.name |
| category | stores.category (`store_categories` value) |
| zone_id | stores.zone_id |
| status | stores.status |
| is_open_now | derived from opens_at/closes_at against current time |

### `ProductListItem`

| Field | Source |
|---|---|
| id | products.id |
| store_id | products.store_id |
| name | products.name |
| price_minor | products.price_minor |
| status | products.status |
| primary_image_url | product_images row with lowest sort_order |

### `OrderSummary`

| Field | Source |
|---|---|
| id | orders.id |
| status | orders.status |
| store_id | orders.store_id |
| driver_id | orders.driver_id |
| total_minor | orders.total_minor |
| item_count | count of order_items for the order |
| placed_at | orders.placed_at |

---

## Anti-Agent Rules (inherited from `00_README.md`)

- This document defines interfaces only; it does not authorize new persisted tables beyond those in `03_DATABASE_SCHEMA.md` and `03b_DATABASE_SCHEMA_ADDENDUM.md`.
- Do not modify Supabase based on this document.
- Do not invent additional categories, statuses, or fields in `apps/mobile` code that are not listed here; extend this document first.
- Customer/merchant/driver browse interfaces are documented for consistency but must not be built into working screens until explicitly authorized — this task is scoped to unblocking the Founder Operating System only.
