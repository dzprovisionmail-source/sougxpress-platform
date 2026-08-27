# Chat 23503 staging findings

Date: 2026-08-27
Project: Supabase staging `pmxydehrctwvawjbhrhl`

## Verified schema

The staging schema defines `public.chat_conversations.participant_one` and `participant_two` as foreign keys to `public.profiles.id`. `public.drivers.id` is itself a foreign key to `auth.users.id`; `public.favorite_couriers.courier_id` references `public.drivers.id`. Therefore the Chat RPC requires a profile/auth UUID, not an arbitrary or stale driver identifier.

## Failing UUID audit

Read-only query checked `738a4231-ccbe-4660-bac0-c21d35be3a26` and `7085cc85-326e-4e4f-aaff-e87acdb8e5b3` against both `public.drivers` and `public.profiles`. Neither UUID existed in either table. A read-only lookup in `public.favorite_couriers` for those UUIDs returned no rows. A read-only orphan scan of all `public.drivers` left-joined to `public.profiles` returned an empty set.

Interpretation: the reported 23503 values are stale/orphaned IDs at the time of the error, while current staging does not show a systemic drivers-without-profiles condition. The client still lacked a guard before calling the RPC.

## Existing RPC contract

`public.get_or_create_chat_conversation(p_other_user uuid, p_relationship_type text, p_reference_id uuid default null)` canonicalizes participant ordering, calls `public.can_start_chat`, and inserts into `public.chat_conversations`. `can_start_chat` reads roles from `public.profiles`, and `customer_courier` relationship checks compare the participant UUID to `delivery_assignments.driver_id` / favorite courier IDs.

## Local fix

`apps/mobile/src/app/(tabs)/favorites.tsx` now performs a read-only `profiles.id` existence check before invoking `getOrCreateConversation`. If the target is stale/orphaned, it throws locally and shows the existing Arabic warning instead of sending an invalid UUID to the RPC. The RPC receives `participant.id` only after the profile check.

## Staging migration history

Staging contains `fix_commercial_chat_favorite_relationships` version `20260827005044`, `push_device_lifecycle` version `20260827134637`, `chat_push_notifications` version `20260827134701`, `add_stores_closed_day` version `20260827155029`, and `fix_driver_update_rls` version `20260827164602`. No additional DDL was applied for the client-side guard.

## Local validation

`git diff --check`: PASS.

Initial workspace-filtered TypeScript command used an incorrect workspace selector and did not run. The corrected command `cd apps/mobile && pnpm exec tsc --noEmit --pretty false` ran and reported existing baseline errors, including several pre-existing errors in `favorites.tsx` unrelated to the new lines (subtitle prop, WorkspaceScreen props, EmptyState props, and MerchantFavoriteCourier.driver typing), plus unrelated errors elsewhere. No TypeScript diagnostic pointed to the new profile guard lines 205-219.

## Blocked functional verification

A real authenticated customer session was not available in the sandbox during this pass, so the complete end-to-end authenticated RPC/realtime/push verification remains pending. No staging write, operational test data, production access, commit, push, OTA, APK, EAS build, or EAS submit was performed for this Chat fix.

## Auth staging verification (2026-08-27)

A read-only query against `auth.users` joined to `public.profiles` found:

| Supplied account label | Auth/profile status | Role | Test readiness |
|---|---|---|---|
| Courier | Account exists, email confirmed, not banned, profile exists | `driver` | Schema identity is valid; password sign-in attempt returned `Invalid login credentials` |
| Customer | Account exists, email confirmed, not banned, profile exists | `founder` | Not a customer test account; password sign-in attempt returned `Invalid login credentials` |
| Merchant | No matching account for the supplied malformed address | Unknown | Not available for testing |

No password, JWT, service-role secret, or session token is stored in this report. No account was created or modified. Authenticated Chat/RLS/Realtime/Push tests remain BLOCKED until valid staging credentials or authenticated app sessions are supplied.
