# Soug-XPRESS End-to-End Audit Report

**Date:** 2026-08-27
**Scope:** Static repository audit, System Map comparison, role and feature review, Supabase staging read-only audit, financial/security/Realtime review, final verification, and Android APK build.

## Executive Result

The audit completed without database writes, RLS changes, Auth changes, RPC changes, OTA updates, commits, or pushes. The current working tree was preserved. The existing local fixes were not overwritten.

A new Android APK was built successfully with EAS using the existing `preview` profile, `preview` channel, Expo SDK 54, runtime `1.0.0`, and version `1.0.0`.

## Repository and Build State

| Item | Result |
|---|---|
| Branch | `main` |
| HEAD | `f709a1cc2a2bab36bc7ddbd5379cc380a59fb7ce` |
| `origin/main` | Same as HEAD |
| `git diff --check` | PASS |
| Existing working-tree changes | Preserved |
| Commit | NOT RUN |
| Push | NOT RUN |
| OTA | NOT RUN |
| APK | BUILT |

## Supabase and Commercial Policy Audit

The active staging project was inspected using read-only queries. The published `can_start_chat` and `get_or_create_chat_conversation` functions match the latest local commercial-chat migration. `get_or_create_chat_conversation` uses `auth.uid()` and raises `P0001` when `can_start_chat` rejects the role pairing or relationship.

Commercial chat remains restricted to customer↔merchant, customer↔courier, and merchant↔courier. Relationships can be established through the supported favorite models or delivery/order assignment history. Founder and admin roles do not satisfy the supported role-pair checks and therefore remain blocked from commercial chat.

The database contains two distinct courier-favorite concepts. `favorite_couriers` represents customer-owned courier favorites and has a unique `(user_id, courier_id)` constraint. `courier_favorites` represents courier-owned store/customer favorites and has the `courier_favorites_unique_target` unique constraint on `(courier_id, target_type, target_id)`. The existing `favorite.service.ts` conflict handling and per-target promise serialization address the observed duplicate-key path without changing schema, RLS, or RPC.

## Financial Audit

The mobile source of truth defines a fixed delivery fee of `15000` minor units, equivalent to `150 DZD`, a courier subscription of `50000` minor units, equivalent to `500 DZD` per month, a merchant subscription of `100000` minor units, equivalent to `1000 DZD` per month, a one-month trial, a courier share rate of `100%`, and a platform share rate of `0%`.

The live staging schema and latest financial migration agree with those values. The subscription table uses `monthly_price_minor`, `trial_start`, `trial_end`, and `current_period_end`; the observed driver and merchant prices match the mobile constants. No financial database object was modified during this audit.

## Static Verification

`git diff --check` passed. The mobile TypeScript check remains blocked by pre-existing baseline errors in files including `favorites.tsx`, `orders-courier.tsx`, `founder/activity-control.tsx`, `useAdminProfile.ts`, `useStores.ts`, and `promotional-views.service.ts`. These errors were reported but not mass-refactored because doing so would exceed the safe, focused repair boundary and could affect Founder, Merchant, Driver, or financial behavior.

## EAS Build Result

| Item | Value |
|---|---|
| Build ID | `8ffe9825-6e49-4af2-b147-1d2d5f654a8c` |
| Platform | Android |
| Profile | `preview` |
| Channel | `preview` |
| SDK | `54.0.0` |
| Runtime | `1.0.0` |
| Version | `1.0.0` |
| Status | finished |
| Fingerprint | `035543e38f40f4634f4a0bbc7af5b4ebfef0fde1` |
| APK | https://expo.dev/artifacts/eas/6lmJVx_dx21Ddl6DXNm3MlQfjl1ZDYD7rNHk7W4AMDI.apk |
| Build logs | https://expo.dev/accounts/bmatech/projects/sougxpress-founder-os/builds/8ffe9825-6e49-4af2-b147-1d2d5f654a8c |

## Remaining Risks and Recommendations

The most important remaining technical issue is the existing TypeScript baseline failure. It should be addressed in a separate, scoped maintenance task with role-by-role regression checks. The Realtime references for driver profiles, assignments, and available assignments were reviewed separately from Favorites; no evidence was established that they caused the duplicate-key Favorites error, so no Realtime or schema change was made.

The APK was built from the repository commit identified by EAS as `f709a1cc2a2bab36bc7ddbd5379cc380a59fb7ce`. The working-tree changes remain local and uncommitted, so a future release process should explicitly decide whether those changes are intended for the next build before publishing another artifact.
