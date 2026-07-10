# 03b — Database Schema Addendum (Founder Operating System & Platform Settings)

## Status

Documentation Phase Only. This addendum extends `03_DATABASE_SCHEMA.md` with the tables required specifically to power the Founder Operating System: centralized financial settings, Founder overrides, and platform-wide observability aggregates. No SQL has been executed; no Supabase project has been modified.

## Relationship to 03_DATABASE_SCHEMA.md

`03_DATABASE_SCHEMA.md` defines the core marketplace entities (customers, merchants, stores, products, orders, drivers, finance, promotions, disputes, audit logs). This document does not redefine or duplicate those tables — it adds the layer the Founder Operating System needs to see, measure, and override the platform, per the Founder Operating System Principle in `00_README.md`.

---

## 1. Platform Financial Settings

`platform_financial_settings`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| key | text | unique, e.g. `default_commission_rate`, `base_delivery_fee_minor`, `per_km_fee_minor` |
| value | jsonb | typed per key; kept generic so new constants can be added without a migration |
| zone_id | uuid | FK -> zones.id, nullable — null means platform-wide default, non-null overrides for that zone |
| effective_from | timestamptz | |
| set_by | uuid | Founder/admin actor id |
| created_at | timestamptz | |

This is the single table backing every platform-wide rate (commission, delivery fee formula, minimum order value, etc.). A per-order `merchants.commission_rate` override (see `03_DATABASE_SCHEMA.md`) takes precedence over the platform default when set; the platform default here is the fallback.

Anti-agent rule: financial constants must never be hardcoded in application code. TypeScript code in `apps/mobile` must read effective values derived from this table (directly or via a computed API), never inline literals.

---

## 2. Founder Overrides

`founder_overrides`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entity_type | text | table name being overridden, e.g. `orders`, `merchants`, `drivers`, `disputes` |
| entity_id | uuid | id within entity_type |
| override_type | text | e.g. `force_status_change`, `manual_payout_adjustment`, `account_reinstatement` |
| previous_value | jsonb | snapshot before override |
| new_value | jsonb | snapshot after override |
| reason | text | required, human-readable justification |
| founder_id | uuid | actor id, must resolve to a Founder-role account |
| created_at | timestamptz | |

Every override recorded here must also produce a corresponding `audit_logs` row (see `03_DATABASE_SCHEMA.md`), so the override is visible both in the specialized Founder table and in the general audit trail.

---

## 3. Platform Metrics Snapshots

`platform_metrics_snapshots`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| zone_id | uuid | FK -> zones.id, nullable — null = platform-wide aggregate |
| metric_period | text | `hourly` \| `daily` \| `weekly` \| `monthly` |
| period_start | timestamptz | |
| period_end | timestamptz | |
| total_orders | integer | |
| total_gmv_minor | integer | gross merchandise value |
| total_commission_minor | integer | |
| total_delivery_fees_minor | integer | |
| active_customers | integer | |
| active_merchants | integer | |
| active_drivers | integer | |
| dispute_count | integer | |
| created_at | timestamptz | |

This table exists so the Founder Operating System dashboard can render historical trends without recomputing aggregates from raw orders on every page load. Snapshot generation cadence and job design are an implementation detail deferred to `02_DATABASE_FOUNDATION.md` (not yet written) or a future architecture document — this document only defines the shape of the stored result.

---

## 4. Founder Alerts

`founder_alerts`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| category | text | e.g. `low_driver_availability`, `dispute_spike`, `merchant_pending_review`, `payout_failure` |
| severity | text | `info` \| `warning` \| `critical` |
| zone_id | uuid | FK -> zones.id, nullable |
| message | text | |
| related_entity_type | text | nullable |
| related_entity_id | uuid | nullable |
| status | text | `open` \| `acknowledged` \| `resolved` |
| acknowledged_by | uuid | nullable, Founder actor id |
| created_at | timestamptz | |
| resolved_at | timestamptz | nullable |

This gives the Founder Operating System a queryable inbox of things requiring attention, satisfying the "governable by the Founder" requirement without forcing the Founder to manually scan every table.

---

## Anti-Agent Rules (inherited from `00_README.md`)

- This addendum is documentation only. No SQL migration exists yet and none should be generated from this document without explicit Founder instruction.
- Do not modify Supabase based on this document.
- All financial constants must resolve through `platform_financial_settings`, never be hardcoded in `apps/mobile`.
- Every row in `founder_overrides` must have a matching `audit_logs` entry; the two are not substitutes for each other.
