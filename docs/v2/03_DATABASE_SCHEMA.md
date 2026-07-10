# 03 — Database Schema (Core)

## Status

Documentation Phase Only. This document defines the target Supabase/PostgreSQL schema for Soug-XPRESS V2. It is a specification, not an executed migration. No SQL has been run against any database. No Supabase project has been modified as a result of this document.

## Purpose

This is the single source of truth for the core V2 data model. TypeScript interfaces in `apps/mobile` must map exactly to the tables and fields defined here. Where this document and any code disagree, this document wins until formally revised.

## Scope for This Phase

- Launch market: **Ain Sefra only**. The platform is modeled around **zones**, not cities, from day one — Ain Sefra is simply the first zone set that will be configured.
- Core marketplace entities: customers, merchants, stores, products, orders, drivers, finance, promotions, disputes, audit logs.
- Founder Operating System requires read access to all tables below; it introduces no additional core tables of its own (its own aggregation/override tables live in `03b_DATABASE_SCHEMA_ADDENDUM.md`).

## Conventions

- All primary keys are `uuid` (`gen_random_uuid()` at implementation time).
- All tables have `created_at timestamptz` and `updated_at timestamptz`.
- Soft state changes use explicit `status` enums, never boolean flags, so history and Founder overrides remain auditable.
- Monetary values are stored as integer minor units (e.g. centimes) — never floating point — to avoid rounding drift in finance calculations.
- Every table that represents a business action (orders, payouts, disputes, promotions) must be traceable to an `audit_logs` entry.

---

## 1. Zones

`zones`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Ain Sefra - Center" |
| city | text | "Ain Sefra" for launch; not used for routing logic |
| boundary | jsonb | geo boundary definition (polygon), implementation detail deferred |
| status | text | `active` \| `inactive` \| `planned` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Zones are the unit of operational scope everywhere in V2: merchants, drivers, and orders are all scoped to a zone. Cities are descriptive metadata only, never a query boundary.

---

## 2. Customers

`customers`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, mirrors `auth.users.id` |
| full_name | text | |
| phone | text | unique |
| zone_id | uuid | FK -> zones.id, primary/home zone |
| status | text | `active` \| `suspended` \| `banned` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`customer_addresses`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK -> customers.id |
| zone_id | uuid | FK -> zones.id |
| label | text | e.g. "Home", "Work" |
| address_text | text | |
| latitude | numeric | |
| longitude | numeric | |
| is_default | boolean | |
| created_at | timestamptz | |

---

## 3. Merchants & Stores

`merchants`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, mirrors `auth.users.id` for the owner account |
| business_name | text | |
| owner_full_name | text | |
| phone | text | unique |
| zone_id | uuid | FK -> zones.id |
| status | text | `pending_review` \| `active` \| `suspended` \| `rejected` |
| commission_rate | numeric | overrides platform default when set, see `03b` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`stores`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| merchant_id | uuid | FK -> merchants.id |
| zone_id | uuid | FK -> zones.id |
| name | text | |
| category | text | see `03c` market interface for taxonomy |
| status | text | `draft` \| `active` \| `paused` \| `suspended` |
| opens_at | time | |
| closes_at | time | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

A merchant may own multiple stores. A store belongs to exactly one zone.

---

## 4. Products

`products`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| store_id | uuid | FK -> stores.id |
| name | text | |
| description | text | |
| price_minor | integer | minor currency units |
| stock_quantity | integer | nullable = unlimited |
| status | text | `active` \| `out_of_stock` \| `archived` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`product_images`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| product_id | uuid | FK -> products.id |
| url | text | |
| sort_order | integer | |

---

## 5. Orders

`orders`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK -> customers.id |
| store_id | uuid | FK -> stores.id |
| zone_id | uuid | FK -> zones.id, denormalized at creation for reporting stability |
| driver_id | uuid | FK -> drivers.id, nullable until assigned |
| status | text | `pending` \| `accepted` \| `preparing` \| `ready_for_pickup` \| `picked_up` \| `delivered` \| `cancelled` \| `disputed` |
| subtotal_minor | integer | sum of order_items |
| delivery_fee_minor | integer | see `03b` financial constants |
| platform_commission_minor | integer | computed at order finalization |
| total_minor | integer | |
| delivery_address_id | uuid | FK -> customer_addresses.id |
| placed_at | timestamptz | |
| delivered_at | timestamptz | nullable |
| cancelled_reason | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`order_items`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK -> orders.id |
| product_id | uuid | FK -> products.id |
| quantity | integer | |
| unit_price_minor | integer | price at time of order, immutable |
| line_total_minor | integer | |

`order_status_history`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK -> orders.id |
| status | text | mirrors orders.status enum |
| changed_by | uuid | FK -> any actor id (customer/merchant/driver/founder) |
| changed_by_role | text | `customer` \| `merchant` \| `driver` \| `founder` \| `system` |
| created_at | timestamptz | |

---

## 6. Drivers

`drivers`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, mirrors `auth.users.id` |
| full_name | text | |
| phone | text | unique |
| zone_id | uuid | FK -> zones.id, primary operating zone |
| vehicle_type | text | e.g. `motorcycle`, `bicycle`, `car` |
| status | text | `pending_review` \| `active` \| `suspended` \| `offline` |
| availability | text | `online` \| `offline` \| `on_delivery` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`driver_locations`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| driver_id | uuid | FK -> drivers.id |
| latitude | numeric | |
| longitude | numeric | |
| recorded_at | timestamptz | most recent ping wins for live tracking |

---

## 7. Finance

`payouts`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| recipient_type | text | `merchant` \| `driver` |
| recipient_id | uuid | FK -> merchants.id or drivers.id depending on recipient_type |
| amount_minor | integer | |
| status | text | `pending` \| `processing` \| `paid` \| `failed` |
| period_start | date | |
| period_end | date | |
| paid_at | timestamptz | nullable |
| created_at | timestamptz | |

`transactions`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK -> orders.id, nullable for non-order transactions |
| type | text | `order_payment` \| `commission` \| `payout` \| `refund` \| `adjustment` |
| amount_minor | integer | signed: positive = inflow to platform, negative = outflow |
| created_at | timestamptz | |

Financial constants (commission rates, delivery fee rules, platform-wide rates) are governed centrally; see `03b_DATABASE_SCHEMA_ADDENDUM.md` for the `platform_financial_settings` table that stores them.

---

## 8. Promotions

`promotions`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| scope | text | `platform` \| `zone` \| `store` |
| scope_id | uuid | nullable, FK depends on scope (zones.id or stores.id); null when scope = platform |
| code | text | nullable, null means auto-applied |
| discount_type | text | `percentage` \| `fixed_amount` \| `free_delivery` |
| discount_value | numeric | interpreted per discount_type |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| status | text | `draft` \| `active` \| `expired` \| `cancelled` |
| created_by | uuid | founder or authorized actor |
| created_at | timestamptz | |

`promotion_redemptions`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| promotion_id | uuid | FK -> promotions.id |
| order_id | uuid | FK -> orders.id |
| customer_id | uuid | FK -> customers.id |
| discount_applied_minor | integer | |
| created_at | timestamptz | |

---

## 9. Disputes

`disputes`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK -> orders.id |
| raised_by | uuid | actor id |
| raised_by_role | text | `customer` \| `merchant` \| `driver` |
| reason_category | text | e.g. `item_missing`, `item_damaged`, `late_delivery`, `payment_issue`, `other` |
| description | text | |
| status | text | `open` \| `investigating` \| `resolved` \| `rejected` |
| resolution | text | nullable |
| resolved_by | uuid | nullable, founder/admin actor id |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 10. Audit Logs

`audit_logs`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| actor_id | uuid | nullable, null = system-generated |
| actor_role | text | `customer` \| `merchant` \| `driver` \| `founder` \| `system` |
| action | text | short machine-readable action name, e.g. `order.status_changed` |
| entity_type | text | table name the action refers to |
| entity_id | uuid | id within entity_type |
| metadata | jsonb | free-form details of the change (before/after where relevant) |
| created_at | timestamptz | |

Every state-changing action across orders, payouts, disputes, promotions, and account status must write an `audit_logs` row. This is the mechanism that makes the platform "observable and governable by the Founder" per the V2 Founder Operating System Principle.

---

## Deferred to Later Documents

- Row-level security policies: `04_RLS_POLICIES.md` (not yet written).
- Founder-specific override/aggregation tables: `03b_DATABASE_SCHEMA_ADDENDUM.md`.
- Public-facing filtering, search, and category taxonomy contracts consumed by client apps: `03c_MARKET_INTERFACE_SCHEMA.md`.

## Anti-Agent Rules (inherited from `00_README.md`)

- This schema is documentation only. No SQL migration exists yet and none should be generated from this document without explicit Founder instruction.
- Do not modify Supabase based on this document.
- Do not treat legacy V1 tables/columns as authoritative; this schema was derived from the V2 vision, not from V1 code.
