---
name: Schema drift reconciliation (migration 024)
description: Column, constraint, and RLS drift between V1 migrations (001-023) and V2 spec; what migration 024 fixes and what's still needed to apply it
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

## Functions added
- `get_user_role(uuid)`: reads profiles.role; returns NULL for anonymous/missing (not 'customer')
- `find_available_driver(zone_id)`: auto-assign; requires availability='online' AND status='active'
- `driver_set_availability(text)`: RPC for drivers to toggle own availability

## RLS policy changes
- merchants INSERT: allow 'pending_review' as initial status (was only 'pending')
- drivers INSERT: allow 'pending_review' as initial status (was only 'pending')
- drivers UPDATE: admins can set any status; drivers keep status immutable but can change other fields

## Applying the migration
**Current blocker**: Only `EXPO_PUBLIC_SUPABASE_ANON_KEY` is in Replit Secrets. The anon key maps to the PostgreSQL `anon` role which cannot execute DDL.

**Required credential (one of):**
1. `SUPABASE_SERVICE_ROLE_KEY` → use Supabase Management API to execute SQL
2. `DATABASE_URL` (postgres://postgres:...@db.*.supabase.co:5432/postgres) → use psql or supabase CLI
3. `SUPABASE_ACCESS_TOKEN` → use `supabase link && supabase db push`

**Why:** get_user_role() returning NULL instead of 'customer' for anonymous prevents privilege escalation. This is a security constraint, not a bug.
