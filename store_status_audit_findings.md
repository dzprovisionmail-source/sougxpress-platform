# Store Status Audit Findings

Date: 2026-08-27

## Supabase schema (read-only)

The live `public.stores` table contains `id`, `opening_hours` (`jsonb`, nullable), `is_open` (`boolean NOT NULL DEFAULT true`), `updated_at`, `status` (`text NOT NULL DEFAULT 'active'`), `opens_at` (`time without time zone`, nullable), and `closes_at` (`time without time zone`, nullable). No closing-day column was found in the inspected schema.

## Active-store sample (read-only, LIMIT 100)

The current active sample returned 12 stores. Three stores (`مكتبة الرمال`, `رحيق`, `MAHDJOUB sport STORE`) have `is_open=false` with both `opens_at` and `closes_at` null and `opening_hours` null. `الإستقامة` has `is_open=false`, `opens_at=null`, and `closes_at=24:00:00`. The remaining eight sampled stores have `is_open=true`, `opens_at=08:00:00`, and `closes_at=22:00:00`.

## Initial root-cause signal

The current data and frontend fallback (`isOpen={store.is_open ?? store.status === 'active'}` plus `store.is_open !== false ? 'مفتوح الآن' : 'مغلق'`) allow a stale/admin boolean to determine display. Stores with `is_open=false` and no usable schedule are therefore rendered closed. The live schema does not currently expose an optional closing-day field, so implementing the requested closing-day behavior requires a schema decision/migration unless an existing JSONB convention is confirmed.

No writes were executed.
