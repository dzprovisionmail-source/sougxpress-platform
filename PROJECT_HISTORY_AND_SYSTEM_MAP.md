# PROJECT HISTORY AND SYSTEM MAP

> **Purpose:** A repository-grounded reference for understanding the Soug-XPRESS application before future changes.
>
> **Document status:** Documentation only. This file does not define runtime behavior and must not be treated as a substitute for the current source code, applied database schema, or deployment configuration.
>
> **Author:** Manus AI
> **Repository:** `dzprovisionmail-source/sougxpress-platform`
> **Primary language:** Arabic with RTL layout
> **Primary market:** Ain Sefra, Algeria
> **Snapshot basis:** repository source, migrations, existing project documentation, and Git history inspected on 2026-08-27.

## Reading Rules

This map distinguishes between **implemented behavior**, **historical behavior**, and **known limitations**. A statement is considered implemented only when supported by source code, a migration, or an existing repository document. Where the repository contains legacy routes, duplicate names, or both `driver` and `courier` terminology, the distinction is called out explicitly.

The authoritative runtime source remains the current code and the database schema actually applied to the connected Supabase project. This document is a historical and architectural index, not a permission to change business rules.

# 1. Project Overview

## 1.1 Product identity and goal

Soug-XPRESS is an Arabic RTL local-commerce platform for Ain Sefra, Algeria. It connects customers, merchants, and delivery workers through a marketplace, order, delivery, communication, administration, and governance system. The repository describes the product as an urban commerce operating system whose main experiences are the Customer Experience, Merchant Experience, Driver Experience, and Founder OS.

The application combines discovery of local stores and products, shopping and checkout, merchant operations, courier delivery operations, commercial chat, favorites-based relationship discovery, notifications, media/content management, and administrative reporting.

## 1.2 Platforms and deployment

The principal client is a mobile application implemented with Expo and React Native. The application uses Expo Router for file-based navigation and is configured for Android and iOS, with an Android internal preview profile that produces an APK. Expo Updates is configured for the `preview` channel and uses `runtimeVersion.policy = appVersion`; the current app version is `1.0.0`.

The backend is Supabase/PostgreSQL. Database schema, functions, triggers, indexes, RLS policies, and data migrations are stored under `supabase/`. The repository is a pnpm workspace, although the primary product implementation is under `apps/mobile/`.

| Layer | Current implementation |
|---|---|
| Mobile client | Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9 |
| Navigation | Expo Router 6, file-based routes |
| Backend | Supabase, PostgreSQL, `@supabase/supabase-js` |
| Persistence | Supabase tables, views, functions/RPCs, Storage, AsyncStorage/SecureStore |
| Realtime | Supabase Realtime subscriptions, centralized registry utilities |
| Styling | React Native StyleSheet plus repository design tokens and theme modules |
| Images/media | Expo Image Picker, Image Manipulator, upload/compression utilities, media viewer/video components |
| Notifications | `expo-notifications`, push-device lifecycle and notification routing |
| Build/update | EAS Build, EAS Update, Android preview APK profile |
| Language direction | Arabic RTL, forced at app root through `I18nManager` |

## 1.3 Repository map

| Directory | Responsibility |
|---|---|
| `apps/mobile/` | Official mobile application, routes, screens, components, hooks, services, constants, design system, and assets |
| `supabase/migrations/` | Ordered database schema, functions, triggers, RLS, indexes, views, and security changes |
| `docs/` | Architecture, repository, migration, and forensic reference documents |
| `packages/` | Reserved/shared packages area; currently minimal |
| `planning/` | Future planning/backlog area; currently minimal |
| `tooling/` | Tooling area; currently minimal |
| `.manus/` | Task-side audit/apply request artifacts and database inspection inputs; not runtime application code |
| `attached_assets/` | Historical prompt and task attachments |

# 2. User Roles

The role model is primarily represented in `profiles.role`. The supported operational role names include `customer`, `merchant`, `driver`, `courier`, `founder`, and `admin`. The repository contains both `driver` and `courier` terminology; newer delivery and favorites logic often uses `drivers` as the canonical table while UI and legacy routes may say courier.

## 2.1 Customer

A Customer discovers stores and products, views store details and media, manages a cart, checks out, creates and tracks orders, manages addresses, uses favorites, receives notifications, and communicates commercially with merchants or couriers when the relationship policy permits. Customer routes exist under `apps/mobile/src/app/customer/`, with shared/legacy marketplace routes also present under the root and `(tabs)` route groups.

Typical services and hooks include `cart.service.ts`, `checkout.service.ts`, `order.service.ts`, `favorite.service.ts`, `chat.service.ts`, `product.service.ts`, `store.service.ts`, `profile.service.ts`, address operations, notification services, and `useCart`, `useCheckout`, `useStores`, `useStore`, and profile-related hooks.

The Customer may favorite stores/products/couriers according to the applicable table model, place orders, select or manage delivery addresses, view order status, and start commercial Chat only when `can_start_chat` confirms a valid relationship. A Customer does not access Founder or Admin routes.

## 2.2 Merchant

A Merchant manages a store, products, product images, store media, categories and promotions where permitted, receives and updates orders, coordinates delivery, views merchant favorites and relationship-oriented courier/customer information, receives notifications, and views merchant earnings/subscription information.

Primary routes include `apps/mobile/src/app/merchant/`, shared tabs such as `/(tabs)/store.tsx`, `/(tabs)/my-store.tsx`, `/(tabs)/products.tsx`, merchant order routes, and the merchant profile/store routes. Relevant services include `merchant.service.ts`, `merchant-orders.service.ts`, `merchant-earnings.service.ts`, `merchant-notifications.service.ts`, `product.service.ts`, `store-media.service.ts`, `promotion.service.ts`, and `favorite.service.ts`.

The Merchant can manage operational store content and orders, select/coordinate available drivers through supported backend functions, and start commercial Chat only with a valid Customer/Courier relationship. Merchant access does not imply Founder/Admin access.

## 2.3 Driver / Courier

The platform uses both labels. `driver` is a profile role and `drivers` is the principal table used by much of the current operational and favorites logic. `courier` appears in user-facing screens, legacy structures, route names, and some services. The legacy `couriers` table may still exist and must not be assumed interchangeable with `drivers` without checking the relevant function or query.

A Driver/Courier can complete or manage delivery assignments, inspect available assignments, accept or update delivery work, track delivery context, view earnings, manage profile/settings/notifications, and participate in commercial relationships with Customers and Merchants when the relationship policy permits. Key routes include `/(tabs)/driver.tsx`, `/(tabs)/deliveries.tsx`, `/(tabs)/earnings.tsx`, `driver/`, `courier/`, and courier profile/tracking routes.

Relevant services and hooks include `driver.service.ts`, `courierService.ts`, `courier-delivery.service.ts`, `driver-orders.service.ts`, `driver.service.ts`, `useDriver`, `useCourier`, `useDriverOrders`, `useCourierOrders`, and Realtime subscriptions for driver profiles and assignments.

## 2.4 Founder

Founder is the platform governance role. The Founder OS provides operational oversight, user/store/driver management, approvals, orders and deliveries control, categories, hero/content management, market presence/settings, support/commercial Chat control, reports, finance, subscriptions, audit logs, and system settings.

Founder routes are under `apps/mobile/src/app/founder/`. Services include the founder-specific service family: `founder.service.ts`, `founder-finance.service.ts`, `founder-orders.service.ts`, `founder-delivery.service.ts`, `founder-courier.service.ts`, `founder-users.service.ts`, `founder-stores.service.ts`, `founder-reports.service.ts`, `founder-chat.service.ts`, `founder-settings.service.ts`, and related content/demo services.

Founder/Admin is not a commercial Chat participant. When the Founder uses market preview/context, the application must not use Founder identity as a Customer/Merchant/Courier substitute to open commercial Chat. The commercial relationship RPC remains authoritative.

## 2.5 Admin

Admin is an administrative role protected by `apps/mobile/src/app/admin/_layout.tsx` and `useAdminProfile`. The guard authorizes `profiles.role` values `admin` or `founder` before rendering the Admin stack. Admin routes cover dashboards, stores, merchants, drivers, customers, orders, products, categories, zones, finance, subscriptions, promotions, notifications, reports, disputes, settings, logs, and profile.

Admin and Founder are privileged governance identities, not ordinary marketplace roles. Access to `/admin` or `/founder` is role-guarded and must not be achieved using `preview=1`, `identity=soug-admin`, or a market-context parameter as an authentication substitute.

## 2.6 Platform public identity

The repository also supports a non-Auth public platform identity, including the `soug-admin` slug through `platform_public_profiles`. This identity is used for official public content/comments and support presentation. It is not an Auth account and cannot replace a real authenticated Founder/Admin account.

# 3. Application Navigation

## 3.1 Root entry and role selection

The root entry is `apps/mobile/src/app/index.tsx`. It coordinates the initial session/role state and the Founder/Admin entry query parameter. The role-selection screen is `apps/mobile/src/app/login.tsx`; the ordinary choices are customer shopping, merchant selling, courier/driver work, and market exploration. The small footer link labeled `سوق إكسبريس` opens the administrative entry path using the root `admin=1` parameter, while the descriptive footer sentence remains non-clickable.

The current Founder entry concept is:

```text
initial role screen
  → tap the clickable “سوق إكسبريس” footer label
  → root entry with admin=1
  → Founder/Admin login form
  → Supabase signInWithPassword
  → read profiles.role
  → /founder (or authorized administrative route)
```

`admin=1` selects the administrative login presentation; it must not change the submitted email/password or bypass Supabase Auth. `preview=1` and `identity=soug-admin` are context/public-identity concepts and must not be used as authentication bypasses.

## 3.2 Root stack and shared routes

`apps/mobile/src/app/_layout.tsx` provides the application root, theme/safe-area context, RTL setup, Supabase session handling, push notification registration/routing, and root stack. Shared routes include authentication callbacks, cart, checkout, chat list/detail, product details, store details, courier details/tracking/settings, guest marketplace, customer-auth, driver-auth, merchant-auth, and platform profile routes.

| Route family | Representative files |
|---|---|
| Root entry/auth | `index.tsx`, `login.tsx`, `customer-auth.tsx`, `driver-auth.tsx`, `merchant-auth.tsx`, `auth/callback.tsx` |
| Marketplace | `guest-marketplace.tsx`, `(tabs)/market.tsx`, `store-details.tsx`, `product-details.tsx` |
| Cart/checkout | `cart.tsx`, `customer/cart.tsx`, `checkout.tsx` |
| Chat | `chat/index.tsx`, `chat/[id].tsx` |
| Courier context | `courier/[id].tsx`, `courier/customer-tracking.tsx`, `courier/settings.tsx` |
| Public platform identity | `platform-profile/[slug].tsx` |

## 3.3 Customer navigation

The authenticated customer workspace is represented by `apps/mobile/src/app/customer/_layout.tsx` and customer routes for home, profile, cart, favorites, orders, addresses, notifications, and settings. The repository also retains shared `(tabs)` customer-oriented screens such as `home.tsx`, `market.tsx`, `cart.tsx`, `favorites.tsx`, `orders-customer.tsx`, `orders.tsx`, and `profile.tsx`. When modifying customer navigation, verify which route group is active in the current entry flow instead of assuming that every legacy screen is reachable.

## 3.4 Driver/Courier navigation

Driver/Courier navigation is split between `(tabs)` operational screens and the `driver/` or `courier/` route groups. The main visible surfaces are dashboard/driver home, deliveries, orders, earnings, profile, notifications, settings, customer tracking, and courier profile/detail views. `/(tabs)/earnings.tsx` is the current earnings/subscription UI surface referenced by the financial migration work.

## 3.5 Merchant navigation

Merchant navigation is under `apps/mobile/src/app/merchant/_layout.tsx` and includes dashboard, store, profile, orders, earnings, favorites, notifications, promotions, and merchant-specific order/store routes. Shared tab screens may be used for orders, earnings, profile, products, store, and my-store. `merchant/profile.tsx` contains the merchant-facing store/profile subscription presentation.

## 3.6 Founder and Admin navigation

Founder navigation is protected by `founder/_layout.tsx` and includes the Founder OS dashboard/index, approvals, customers, merchants, stores, drivers/couriers, deliveries, orders, finance, reports, content, hero slides, market presence/settings, categories, settings, audit log, activity controls, views management, and support/chat controls.

Admin navigation is protected by `admin/_layout.tsx` and includes dashboard, stores, merchants, drivers, customers, orders, products, categories, zones, finance/finances, subscriptions, promotions, notifications, reports, disputes, settings, logs, profile, audit logs, and legacy compatibility screens.

# 4. Core Business Features

## 4.1 Stores, marketplace, and discovery

The marketplace loads categories, stores, store media, products, nearby/featured/new sections, and store order-count presentation. Store and product discovery is implemented through `store.service.ts`, `product.service.ts`, `category.service.ts`, `heroSlider.service.ts`, `market-presence.service.ts`, `useStores`, `useStore`, and the market/store/product screens and cards.

The market may be entered as a guest or authenticated role. Founder market preview is a context feature and must preserve Founder authentication rather than impersonating a Customer. Store cards and store details may show delivery fee text, but UI display must remain separate from backend fee calculation.

| Dependency type | Current use |
|---|---|
| Database | `stores`, `products`, `categories`, `subcategories`, media tables, promotions, zones |
| RPC | Store order-count and selected secure/commercial functions |
| Realtime | Store lists and market presence where subscribed |
| Storage | Store images, gallery, videos, product images |

## 4.2 Products and catalog

Merchants and authorized administrators manage products, images, categories, subcategories, and store associations. Customers browse product details, add items to the cart, and navigate back to the owning store. Relevant files include product cards, product details, `product.service.ts`, `useProducts`, merchant products/store screens, and Founder/Admin product/category screens.

## 4.3 Cart and checkout

Cart behavior is implemented by `cart.service.ts`, `useCart`, cart item/summary components, and customer/shared cart routes. Checkout uses `checkout.service.ts`, `useCheckout`, address cards, payment method, and order summary components. The financial migration established a fixed delivery fee of 150 DZD and platform delivery commission of zero; UI-only changes must not silently alter the calculation path.

The order pipeline creates orders and order items, resolves delivery address and store context, and then exposes the order to merchant and delivery workflows. Verify both client hooks and database-side defaults/functions when changing totals.

## 4.4 Orders

Orders are represented by `orders`, `order_items`, and `order_status_history`. Customer, Merchant, Courier/Driver, Founder, and Admin have distinct order views and operations. Services include `order.service.ts`, `merchant-orders.service.ts`, `driver-orders.service.ts`, `founder-orders.service.ts`, and related hooks.

The order lifecycle includes customer placement, merchant processing/preparation, courier assignment or direct driver selection where supported, delivery status progression, and customer tracking. Order data should not be confused with display-only store order-count overrides.

## 4.5 Delivery and courier assignments

Delivery operations use `delivery_assignments`, driver/courier services, merchant selection functions, customer tracking, available assignment subscriptions, and Founder delivery controls. Relevant database functions include functions for available drivers, assignment, direct delivery offers, commercial order details, and courier/customer relationship views.

Realtime channels include `driver_profile`, `driver_assignments`, and `available_assignments`. The last channel intentionally listens broadly and filters/re-fetches client-side where the underlying Realtime filter cannot express the desired null condition. These channels are operational and independent of Favorites uniqueness errors.

## 4.6 Favorites and commercial relationship discovery

Favorites are role- and direction-specific. The principal tables are `customer_favorites`, `favorite_couriers`, `merchant_favorites`, and `courier_favorites`. `customer_favorites` can target stores/products; `favorite_couriers` represents a customer-to-courier preference; `merchant_favorites` supports merchant-to-customer and merchant-to-courier targets; `courier_favorites` supports courier/driver-to-store and courier/driver-to-customer targets.

`favorite.service.ts` owns client toggles and reads. `toggleCourierFavorite` must preserve the uniqueness constraint `(courier_id, target_type, target_id)` represented by `courier_favorites_unique_target`. The current client-side safeguard serializes same-target toggles and handles a `23505` race result without removing the database constraint.

Favorites are also a commercial relationship input for Chat. The existence of a Favorite is not a global Chat permission; it is evaluated against the two authenticated users, their roles, target type, and store ownership as implemented by `can_start_chat`.

## 4.7 Commercial Chat

Chat infrastructure uses `chat_conversations`, `chat_messages`, profile-card functions/views, order context, push notification rows, and the RPC `get_or_create_chat_conversation`. The RPC derives the current user from `auth.uid()` and invokes `can_start_chat` before creating or reusing a conversation.

The supported commercial pairs are Customer ↔ Merchant, Customer ↔ Courier/Driver, and Merchant ↔ Courier/Driver. A valid Favorite relationship or applicable order/delivery relationship may qualify the pair. Founder/Admin are not commercial participants and must be blocked from using a market preview identity to initiate commercial Chat.

Chat permissions are implemented in database functions and RLS, not only in the frontend. The client layer in `chat.service.ts` logs and returns backend errors; `store-details.tsx` supplies the merchant user ID (`store.merchant_id`) as the other participant when opening a store conversation.

## 4.8 Notifications and Push

Push registration, device lifecycle, response routing, and notification presentation are handled by `push-notifications.service.ts`, root layout integration, and the push-device migrations. In-app notification data is represented by `notifications` and role-specific services such as merchant notifications and driver/courier notifications.

The push system includes safe token claiming/releasing and chat notification insertion. Push behavior is a separate subsystem from Chat authorization, Favorites, and commercial relationship checks.

## 4.9 Media, gallery, promotions, and public identity

Store gallery, images, videos, comments, likes, ratings, promotions, promotional views, and upload hardening are separate feature areas. Relevant files include `store-media.service.ts`, `promotion.service.ts`, `promotional-views.service.ts`, media/gallery components, and Founder/Admin content controls.

The platform public identity (`platform_public_profiles`, including the `soug-admin` concept) supports official platform presentation and comments without creating an Auth user. It must not be used as a login or permission mechanism.

## 4.10 Founder OS and administration

Founder/Admin operations cover approvals, user creation/demo data, stores, merchants, drivers/couriers, orders, deliveries, finance, subscriptions, categories, zones, content, hero slides, market settings/presence, audit logs, reports, disputes, notifications, and system settings. Administrative access depends on a real Supabase Auth session and `profiles.role`.

The administrative surface is intentionally distinct from ordinary role workspaces. Changes to Founder access must be audited against root entry, login, Auth session, profile role, route guards, and any preview/identity context before modifying code.

# 5. Financial System

## 5.1 Current financial policy

The current policy replaced the legacy per-delivery 20% platform commission model with role subscriptions. Delivery fee is fixed at **150 DZD**, the platform share of that delivery fee is **0 DZD**, and the Courier/Driver receives **100% = 150 DZD**. The monthly subscription prices are **500 DZD for Drivers/Couriers** and **1000 DZD for Merchants**. The first month is free through the current trial mechanism.

The policy is represented in `apps/mobile/src/constants/earnings.ts` and enforced/represented in the subscription migration and related financial services. Values in the TypeScript constants are stored in minor units: 15000, 50000, and 100000 respectively.

| Value | Minor-unit constant | Meaning | Authority type |
|---|---:|---|---|
| 150 DZD | `FIXED_DELIVERY_FEE_MINOR = 15000` | Fixed delivery fee | Shared client reference; order/database paths must also be checked |
| 500 DZD | `DRIVER_SUBSCRIPTION_PRICE_MINOR = 50000` | Driver/Courier monthly subscription | Financial policy reference and subscription records |
| 1000 DZD | `MERCHANT_SUBSCRIPTION_PRICE_MINOR = 100000` | Merchant monthly subscription | Financial policy reference and subscription records |
| 1 month | `SUBSCRIPTION_TRIAL_MONTHS = 1` | Mandatory first-month trial | Subscription provisioning logic |
| 100% | `DRIVER_SHARE_RATE = 1` | Courier share of delivery fee | Earnings calculation |
| 0% | `PLATFORM_SHARE_RATE = 0` | Platform delivery share | Earnings calculation |

## 5.2 Client-side financial references

`apps/mobile/src/constants/earnings.ts` exposes `computeEarningsSplit(deliveredCount)`, which computes delivery fee, driver share, and platform share using the current policy. `founder-finance.service.ts`, `founder.service.ts`, merchant earnings, and the Driver/Courier earnings screen aggregate or display subscription and payout information.

The current UI copy in `/(tabs)/earnings.tsx` presents the Driver/Courier trial as “الاشتراك الحالي مجاني (نسخة تجريبية)” and the future price as “500 دج اشتراك شهري بعد انطلاق النسخة التجارية”. `merchant/profile.tsx` presents the analogous merchant copy with 1000 DZD. These texts do not establish a launch date and must not introduce a countdown or fixed date.

## 5.3 Database financial objects

The financial migrations introduced `account_subscriptions` and supporting provisioning/trial logic, and disabled the old commission enforcement path as part of the financial transition. Related financial objects include `platform_financial_settings`, `transactions`, `payouts`, `platform_metrics_snapshots`, and administrative subscription/reporting surfaces.

The current subscription provisioning starts a trial for a newly provisioned eligible account. No repository-wide, clearly defined `Commercial Launch` state or launch timestamp was found in the inspected source/migrations. Therefore, future work that changes payment activation to depend on Commercial Launch requires an explicit design and must not invent a date, timer, or hidden automatic launch.

## 5.4 Legacy commission model

Historical migrations and finance audit artifacts contain references to commission fields, commission triggers, and old driver payout behavior. The current migration was designed to replace the 80/20 delivery split, remove the 50-delivery suspension/lock behavior, and set platform delivery commission to zero. Legacy schema/function names may remain for compatibility or historical reasons; search and database inspection are required before deleting or altering them.

When changing money behavior, inspect at minimum `useCart`, `useCheckout`, `checkout.service.ts`, order totals, delivery assignment/payout functions, Founder finance/report services, and all relevant SQL functions/triggers. A UI label change must not be confused with a financial-policy change.

# 6. Data Model and Supabase Boundaries

## 6.1 Core tables observed in the client and migrations

The application references profiles, customers, merchants, drivers, couriers, stores, products, categories, subcategories, orders, order items, order status history, delivery assignments, favorites tables, chat tables, notifications, addresses, subscriptions, transactions, payouts, financial settings, media/gallery tables, promotions, views, zones, and audit/support tables.

The full schema authority is the ordered migration set under `supabase/migrations/`. The client services are not sufficient to infer every RLS rule or trigger side effect.

## 6.2 RPC and function boundary

RPCs are used for security-sensitive and relationship-sensitive operations. Known examples include `get_or_create_chat_conversation`, `can_start_chat`, `get_chat_profile_card`, `get_or_create_support_conversation`, commercial order/contact functions, driver availability/assignment functions, store order-count functions, audit logging, and device lifecycle functions.

A frontend success path does not replace an RPC permission check. Conversely, a `P0001` error from a business function is distinct from an RLS `42501`-style permission failure and must be diagnosed at the correct layer.

## 6.3 RLS boundary

RLS is part of the database security model for profiles, customers, merchants, drivers/couriers, favorites, orders, assignments, Chat, media, notifications, and administrative data. Founder/Admin access is role-guarded in the client and protected by database policies/functions where applicable. No future feature should assume that adding a frontend condition is enough to change authorization.

# 7. Realtime and Asynchronous Systems

Realtime is used for driver profile updates, delivery assignments, available assignment refreshes, store/user/courier lists, commercial operations, and selected notifications. The repository contains `realtime-registry.ts`, `useRealtimeCourierList.ts`, `useRealtimeStoreList.ts`, `useRealtimeUserList.ts`, `useDriver.ts`, `driver-orders.service.ts`, and other subscription helpers.

The warning names `driver_profile`, `driver_assignments`, and `available_assignments` refer to channel identifiers and operational subscriptions. They are independent from the `courier_favorites` uniqueness constraint and from the Chat commercial relationship guard unless a future change explicitly connects them.

Push notifications are separately integrated at the root layout and through database/device lifecycle migrations. Chat message notification insertion is not equivalent to Chat authorization.

# 8. Security and Access Invariants

The following invariants are part of the current architecture:

1. A real Supabase Auth session is required for authenticated operations.
2. `profiles.role` determines the operational role and is checked by protected layouts and database functions.
3. Founder/Admin must not be impersonated as Customer, Merchant, or Courier for commercial operations.
4. `preview`, `admin=1`, and `identity=soug-admin` are routing/context/public-identity concepts, not authentication substitutes.
5. Commercial Chat remains restricted to supported role pairs and valid Favorites/order/delivery relationships.
6. RLS and security-definer RPCs remain authoritative for data access.
7. Financial values must be traced across UI constants, hooks/services, order calculations, database functions, triggers, and reports before modification.
8. Upload limits, image compression, and media count restrictions are separate from Chat, Auth, and financial logic.

# 9. Project History and Important Changes

The following Git history summarizes major implemented work visible in the repository. It is not a replacement for `git log`.

| Commit | Change |
|---|---|
| `c470811` | Replaced delivery commission with subscriptions; introduced the current financial policy transition |
| `71b5723` / `315cdc6` | Founder/admin entry and login fixes |
| `3d2ded8` | Stabilized commercial Chat handling and Home carousel updates |
| `d2c899c` | Updated delivery-fee and subscription UI presentation |
| `f709a1c` | Aligned commercial Chat Favorite relationships through the database function migration |
| `c246834` | Enabled push notifications |
| `575a1ab` | Added Soug-XPRESS support conversations |
| `4cf62b0` / `24245bd` / `688b9b7` | Hardened and adapted image preparation/upload behavior for Expo versions |
| `6cbe7cc` / `6f379e2` | Updated Android branding and app icon |
| `70e58b1` / `c0e82d7` / `7f8a2d2` | Founder market/context, courier management, and Chat navigation continuity work |
| `368e8aa` / `0d2f08e` | Android safe-area and provider/navigation hardening |

The inspected repository state had `origin/main` aligned with the current main branch at the time of documentation, with the most recent visible commit being the commercial Chat Favorite relationship alignment. Future changes must verify the live branch rather than relying on this snapshot.

# 10. Current Known Constraints and Caveats

## 10.1 Driver versus Courier terminology

Do not assume `couriers` and `drivers` are interchangeable. Check the exact table, foreign key, role value, and RPC parameter for each operation. A UI named Courier may still use a `drivers.id` value underneath.

## 10.2 Customer workspace and legacy routes

The repository contains both a customer route group and shared/legacy tab routes. Before changing navigation, trace the current root entry and redirect behavior. A route existing on disk does not prove it is the active route for every session state.

## 10.3 Commercial Launch

No clear reusable Commercial Launch state was found in the inspected source and migration set. Do not add a date, timer, countdown, fixed launch timestamp, or automatic paid-subscription activation without a separately approved design.

## 10.4 TypeScript baseline

Historical verification runs recorded TypeScript errors in unrelated pre-existing files, including favorites, courier orders, Founder activity control, profile/store hooks, and promotional views. A future verification should distinguish baseline errors from errors introduced by the changed files.

## 10.5 UI-only price changes

A visible “200 DZD” may be a fallback or a calculation value rather than a static label. Updating only the displayed string can create a mismatch with the actual order total. Financial behavior must be changed only under a financial-system task with database and service tracing.

# 11. Change-Safety Map for Future Work

Before modifying a feature, identify the owning route, service, hook, component, table, RPC, RLS policy, trigger, and migration. Keep changes within the requested boundary and do not use a frontend bypass to compensate for a backend permission decision.

| Requested change type | Minimum audit surface |
|---|---|
| Founder login | `index.tsx`, `login.tsx`, `auth-entry.service.ts`, session handling, profile role, founder/admin layouts |
| Customer workspace | customer layout/routes, root redirects, shared tabs, cart/order/favorite services, profile/session hooks |
| Commercial Chat | `chat.service.ts`, caller screen, role mapping, Favorite tables, order/assignment relations, `can_start_chat`, `get_or_create_chat_conversation`, Chat RLS |
| Favorites | `favorite.service.ts`, all target tables, unique constraints, RLS, concurrent toggle behavior |
| Delivery fee/payout | cart/checkout hooks and services, order creation, delivery assignment, payout/finance functions, reports, constants/UI |
| Subscriptions | subscription tables, trial/provisioning triggers, merchant/driver screens, Founder finance/subscription reports, launch-state design |
| Realtime | subscription hooks, channel lifecycle, filters, cleanup, table publication, independent warnings/logs |
| Push | root layout registration, device lifecycle, notification rows, response routing, platform config |
| Media/uploads | picker/compression utilities, Storage paths, size/count constraints, media tables/RLS |

# 12. Verification Checklist

Before a future commit, run the narrowest appropriate checks and record the result. At minimum, inspect `git status --short`, review the exact diff, run `git diff --check`, and confirm that only intended files are staged. For mobile changes, run the relevant TypeScript or Expo export check while separating existing baseline failures from new failures.

For database changes, inspect migration ordering, function signatures, trigger names, RLS policies, and applied migration status. Use explicit, limited read queries for verification. Never delete or rewrite historical migrations casually; add a new corrective migration when a schema change is approved.

For authentication or authorization changes, test role separation explicitly: Customer, Merchant, Driver/Courier, Founder, and Admin. Confirm that unauthorized commercial Chat remains blocked and that no preview/public identity parameter bypasses Auth.

# References

The references below are repository-local sources used to build this map. Paths are intentionally included so future maintainers can inspect the implementation directly.

1. [Repository README](README.md) — product identity, primary market, language, repository structure, and main systems.
2. [Repository guide](docs/REPOSITORY_GUIDE.md) — repository conventions and architecture notes.
3. [Migration manifest](docs/MIGRATION_MANIFEST.md) — migration inventory and ordering reference.
4. [Mobile app package](apps/mobile/package.json) — Expo, React Native, Supabase, Router, and runtime dependencies.
5. [Expo app configuration](apps/mobile/app.json) — app version, runtime policy, Updates URL, EAS project ID, and platform configuration.
6. [EAS configuration](apps/mobile/eas.json) — preview channel and Android APK profile.
7. [Earnings constants](apps/mobile/src/constants/earnings.ts) — delivery fee, subscription values, trial period, and earnings split.
8. [Root application layout](apps/mobile/src/app/_layout.tsx) — RTL, session, theme, safe area, and push integration.
9. [Founder/Admin entry](apps/mobile/src/app/index.tsx) — initial routing and administrative entry behavior.
10. [Role selection](apps/mobile/src/app/login.tsx) — ordinary role choices and administrative footer entry.
11. [Admin layout](apps/mobile/src/app/admin/_layout.tsx) — admin/founder role guard and Admin stack.
12. [Commercial Chat architecture](SOUG_XPRESS_COMMERCIAL_CHAT_ARCHITECTURE.md) — Chat relationship model and security rationale.
13. [Commercial Chat security migration](supabase/migrations/20260819010000_chat_security_hardening.sql) — initial Chat security functions and relationship checks.
14. [Permanent/direct Chat migration](supabase/migrations/20260821160000_direct_orders_and_permanent_chat.sql) — later Chat/order relationship behavior.
15. [Commercial Favorite relationship fix](supabase/migrations/20260827010000_fix_commercial_chat_favorite_relationships.sql) — current relationship-check alignment.
16. [Courier Favorites migration](supabase/migrations/20260817240000_add_courier_favorites.sql) — courier/driver Favorite tables and uniqueness behavior.
17. [Merchant Favorites migration](supabase/migrations/20260817020000_add_merchant_favorites.sql) — merchant-owned Favorite relationships.
18. [Merchant-Courier Favorite migration](supabase/migrations/20260817243000_allow_merchant_courier_favorites.sql) — Merchant ↔ Courier Favorite support.
19. [Subscription/commission transition](supabase/migrations/20260826020000_replace_delivery_commission_with_subscriptions.sql) — subscription tables, trial provisioning, and legacy commission transition.
20. [Favorite service](apps/mobile/src/services/favorite.service.ts) — client Favorite reads/toggles and concurrency handling.
21. [Chat service](apps/mobile/src/services/chat.service.ts) — client Chat RPC invocation and error propagation.
22. [Store details](apps/mobile/src/app/store-details.tsx) — store-to-merchant Chat caller and market context.
23. [Driver hook](apps/mobile/src/hooks/useDriver.ts) — driver profile and assignment Realtime subscriptions.
24. [Driver orders service](apps/mobile/src/services/driver-orders.service.ts) — delivery assignment and available-assignment operations.
25. [Driver earnings screen](apps/mobile/src/app/(tabs)/earnings.tsx) — Courier/Driver earnings and subscription presentation.
26. [Merchant profile](apps/mobile/src/app/merchant/profile.tsx) — Merchant store/profile subscription presentation.
27. [Founder finance service](apps/mobile/src/services/founder-finance.service.ts) — Founder finance aggregation surface.

---

**Maintenance rule:** Update this document after major architectural or business-policy changes, but do not edit it as a substitute for updating the source of truth. Every future entry should state the implementation file, database migration/function if applicable, security boundary, and verification performed.
