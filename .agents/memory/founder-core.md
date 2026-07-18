---
name: Founder Core — architecture decisions
description: Key decisions made when building the Founder dashboard, auth layer, and audit log in Phase 1.
---

## Auth guard
Founder area (`apps/mobile/src/app/founder/`) reuses `useAdminProfile` hook directly.
Both `admin` and `founder` roles are authorized to enter.
No separate `useFounderProfile` hook exists or is needed.

**Why:** The task spec says "treat roles `founder` and `admin` as privileged" for this area.

## useFounder.ts
Was a dead stub referencing non-existent exports (`getFounder`, `updateFounder`, `Founder`).
Rewritten as a re-export shim: `export { useAdminProfile as useFounder }`.
Nothing in the codebase imports it — kept for forward compatibility only.

## admin_audit_logs (migration 027)
- Table: `id UUID, admin_user_id UUID, action TEXT, entity_type TEXT, entity_id UUID, details JSONB, created_at TIMESTAMPTZ`
- RLS: SELECT only for admin/founder; **NO INSERT policy** — direct client inserts are blocked
- All writes must use `supabase.rpc("log_admin_audit_event", {...})` (SECURITY DEFINER)
- The RPC re-verifies the caller's `profiles.role` inside the function

**Why:** Audit log entries must not be fakeable by a rogue client.

## delivery_commission_cycles schema
Column for driver earnings: `commission_earned_minor` (INTEGER, minor units = centimes).
Cycle statuses: `active`, `payment_due`, `payment_confirmed`.
"Amount owed by drivers" = `SUM(commission_earned_minor) WHERE status = 'payment_due'`.

## Founder dashboard stats (14 metrics)
All queries in `founder.service.ts::getFounderDashboardStats()` — 16 parallel Supabase calls.
- `suspended_accounts` = sum of suspended customers + merchants + drivers (3 separate count queries)
- `total_completed_deliveries` = count from `delivery_assignments WHERE status = 'delivered'`
- `driver_commissions_owed_minor` = SUM from `delivery_commission_cycles` (not a count)

## Founder screen routes
Stack navigator with 13 registered screens in `founder/_layout.tsx`:
index, users, stores, orders, drivers, finance, content, settings, audit-log,
add-customer, add-merchant, add-driver, add-store.
All placeholder screens use `AdminPageShell` + Arabic "قيد البناء" empty state.

## logFounderDashboardAccess
Best-effort RPC call in `founder/index.tsx::useEffect` — writes to `admin_audit_logs`.
Never throws; failure is swallowed so the dashboard is never blocked.
