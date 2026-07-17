---
name: Schema drift reconciliation (migrations 024 & 025)
description: Column, constraint, and RLS drift between V1 migrations (001-023) and V2 spec; what each migration fixes and how to apply DDL from Replit
---

## Drift fixed by migration 024

| Table | Old (live) | New (V2 spec) |
|---|---|---|
| customers | first_name, last_name, phone_number | + full_name, phone, address (backfill) |
| merchants | contact_email, contact_phone | + owner_full_name, phone, email, address, commission_rate |
| merchants.status | CHECK ('pending', ...) | + 'pending_review'; existing 'pending' rows migrated |
| drivers | first_name, last_name, phone_number, is_available | + full_name, phone, address, availability (backfill) |
| drivers.status | CHECK ('pending', 'active', 'suspended') | + 'pending_review', 'offline'; rows migrated |
| drivers.availability | missing | new column CHECK ('online','offline','on_delivery') |
| customer_addresses | address_line1 | + label, address_text (backfill) |
| stores | no opens_at/closes_at | + opens_at, closes_at; status += 'draft' |
| profiles | id, role only | + full_name, email, phone (for Edge Function) |

## Drift fixed by migration 025

| Table | Problem | Fix |
|---|---|---|
| customers.first_name | NOT NULL, no default — blocked V2 inserts | SET DEFAULT '' |
| customers.last_name | NOT NULL, no default — blocked V2 inserts | SET DEFAULT '' |
| customers.phone_number | NOT NULL UNIQUE — blocked V2 inserts | DROP NOT NULL (UNIQUE kept; NULLs are distinct in PostgreSQL) |
| customers.avatar_url | missing, optional in TS types | ADD COLUMN IF NOT EXISTS TEXT |
| customers.city | missing, optional in TS types | ADD COLUMN IF NOT EXISTS TEXT |
| customers.neighborhood | missing, optional in TS types | ADD COLUMN IF NOT EXISTS TEXT |

## Functions added (024)
- `get_user_role(uuid)`: reads profiles.role; returns NULL for anonymous/missing (not 'customer')
- `find_available_driver(zone_id)`: auto-assign; requires availability='online' AND status='active'
- `driver_set_availability(text)`: RPC for drivers to toggle own availability

## RLS policy changes (024)
- merchants INSERT: allow 'pending_review' as initial status (was only 'pending')
- drivers INSERT: allow 'pending_review' as initial status (was only 'pending')
- drivers UPDATE: admins can set any status; drivers keep status immutable but can change other fields

## Applying migrations from Replit

**psql / supabase db push are blocked**: port 5432 and 6543 direct TCP are blocked by Replit's network sandbox.

**Working method — Supabase Management API:**
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "<SQL here>"}'
```
Returns `[]` for DDL (no rows). Use a follow-up SELECT to verify schema changes applied.

**After applying via API:** record the migration in `supabase_migrations.schema_migrations`:
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('YYYYMMDDHHMMSS', 'migration_name', ARRAY['applied via Management API'])
ON CONFLICT (version) DO NOTHING;
```

**Required secrets:** `SUPABASE_ACCESS_TOKEN` (Supabase personal access token from dashboard → Account → Access Tokens)

**Why:** psql requires outbound TCP on ports 5432/6543; Replit's sandbox blocks those. The Management API uses HTTPS (port 443) which is always open.
