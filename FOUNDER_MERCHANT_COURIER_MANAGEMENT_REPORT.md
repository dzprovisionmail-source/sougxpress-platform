# Founder Merchant & Courier Management Report

## Executive Summary

تمت مراجعة بنية Founder OS، المسارات، الخدمات، Edge Function الخاصة بإنشاء الحسابات، وسياسات Supabase الحالية. النتيجة الأساسية هي أن معظم نطاق الإدارة المطلوب موجود فعلاً في المستودع الحالي، بما في ذلك الاستعراض، البحث، التصفية، فتح التفاصيل، التعديل، تغيير الحالة، وsoft delete للتجار والموصلين والعملاء، إضافة إلى إنشاء حسابات جديدة عبر Edge Function محمية.

لم يتم تنفيذ كتابة على Supabase، ولم يتم تعديل RLS أو Auth أو RPC أو migrations أو منطق مالي أو Push أو Chat. كما تمت إزالة إضافة مكررة غير لازمة من `founder-users.service.ts` بعد التأكد من أن `admin.service.ts` وشاشة الإنشاء الحالية يوفران مسار الإنشاء المعتمد.

## Implemented Surface

| Capability | Current state | Evidence |
|---|---|---|
| Founder dashboard | موجود | `apps/mobile/src/app/founder/index.tsx` |
| Users hub | موجود | `apps/mobile/src/app/founder/users/index.tsx` |
| Customer management | موجود | `customers.tsx`, `customer-detail.tsx` |
| Merchant management | موجود | `merchants.tsx`, `merchant-detail.tsx` |
| Driver/Courier management | موجود | `drivers.tsx`, `driver-detail.tsx` |
| Search and status filtering | موجود | list screens and `founder-users.service.ts` |
| Detail view | موجود | detail routes under `founder/users` |
| Edit profile data | موجود | `updateFounderCustomer`, `updateFounderMerchant`, `updateFounderDriver` |
| Status change | موجود | `setFounderCustomerStatus`, `setFounderMerchantStatus`, `setFounderDriverStatus` |
| Soft delete | موجود | `softDeleteFounderCustomer`, `softDeleteFounderMerchant`, `softDeleteFounderDriver` |
| New account creation | موجود | `founder/users/create.tsx` -> `adminProvisionAccount` |
| Auth user provisioning | موجود عبر Edge Function | `supabase/functions/admin-provision-account/index.ts` |
| Audit logging | موجود، best-effort | `log_admin_audit_event` and `admin_audit_logs` |
| Permanent Auth + DB deletion | غير منفذ | intentionally not added |

## Founder Navigation

The nested users stack is declared in `apps/mobile/src/app/founder/users/_layout.tsx` and contains `index`, `create`, `customers`, `customer-detail`, `merchants`, `merchant-detail`, `drivers`, and `driver-detail`. The implementation uses `AdminPageShell` with Founder OS styling and Arabic RTL text. The existing screens are therefore the correct integration point; no parallel management area was created.

## Creation Flow

The current creation screen accepts a role of `customer`, `merchant`, or `driver`. It validates required fields locally and invokes `adminProvisionAccount` from `apps/mobile/src/services/admin.service.ts`. The client does not use a service-role key. The Edge Function validates the bearer token, loads the caller profile using the service-role client server-side, and allows callers whose profile role is `admin` or `founder`. It then creates the Auth user with confirmed email, upserts the base profile, inserts the role-specific record, and rolls back the Auth user if the profile or role record insert fails.

The Edge Function also checks duplicate phone numbers using the actual role-table columns: `merchants.contact_phone`, `drivers.phone_number`, or `customers.phone_number`. Password values are not returned by the client or audit response.

## Supabase Schema Audit

The active Staging project was inspected read-only. The confirmed role-table columns include:

| Table | Confirmed identity/contact fields | Lifecycle fields |
|---|---|---|
| `customers` | `id`, `first_name`, `last_name`, `phone_number`, `email`, `full_name`, `phone` | `status`, `deleted_at`, `is_demo`, `admin_notes` |
| `drivers` | `id`, `first_name`, `last_name`, `phone_number`, `email`, `full_name`, `phone`, `vehicle_type`, `license_plate`, `vehicle_number` | `status`, `availability`, `deleted_at`, `is_demo`, `is_suspended_for_debt` |
| `merchants` | `id`, `business_name`, `contact_email`, `contact_phone`, `owner_full_name`, `email`, `phone`, `address` | `status`, `deleted_at`, `is_active`, `is_demo`, `admin_notes` |

The Founder service selects the management-facing compatibility fields that are present in the live schema, while the provisioning Edge Function writes the canonical role-table fields used by the current schema.

## Security and Authorization Audit

Current database policies grant administrative operations to both `founder` and `admin` in several tables. Examples include select/update/delete access on `customers`, `merchants`, and `drivers`, with status constraints in the `WITH CHECK` clauses. The Edge Function similarly accepts both `admin` and `founder` callers.

This means Founder OS is protected at the database boundary from ordinary users, but the exact requirement “Founder only” is not currently equivalent to the deployed policy. The current behavior is **admin + founder**, not founder-only.

### NEEDS_DECISION: Founder-only versus Admin + Founder

Changing the policy to founder-only would be a security/business authorization change affecting RLS and the Edge Function. It should not be applied implicitly because the repository and deployed policies currently treat `admin` as an authorized administrative role. A product owner must explicitly choose one of these policies:

1. Preserve the current `admin` + `founder` administrative model.
2. Restrict all requested management and provisioning actions to `founder` only, requiring a reviewed migration and coordinated Edge Function/RLS changes.

No authorization change was made.

## Soft Delete and Permanent Delete

The current implementation intentionally uses soft delete: it sets `deleted_at` and moves the record to a suspended state. This preserves order history, auditability, foreign-key relationships, and financial records. There is no safe generic hard-delete workflow for Auth plus role table plus dependent business data in the current codebase.

### NEEDS_DECISION: Permanent Deletion

The request for permanent deletion from both Supabase Auth and the database is blocked pending an explicit retention policy and dependency review. Before implementing it, the project must define whether deletion is allowed for accounts with orders, deliveries, subscriptions, favorites, chat conversations, notifications, audit logs, uploaded media, or financial history. Until that policy exists, the safe supported operation is soft delete/suspension only.

No hard delete, Auth deletion, cascade, or cleanup migration was added.

## Data Integrity Observations

The live schema contains both canonical fields and compatibility fields on several role tables. This is manageable for the current UI but should be treated as schema drift risk. Future changes should avoid inventing new field names and should use the canonical names already used by `admin-provision-account` and current migrations.

The current role-management service writes directly through the authenticated Supabase client, relying on database RLS. This is acceptable only while the deployed RLS policies remain aligned with the intended Founder/Admin policy. The creation flow correctly uses the server-side Edge Function because Auth Admin API operations and service-role credentials must not be exposed to the mobile client.

## Validation Performed

- Read-only Supabase schema inspection completed.
- Read-only RLS policy inspection completed.
- Edge Function authorization path reviewed.
- Founder routes and nested stack reviewed.
- Existing create/edit/status/soft-delete service calls reviewed.
- No database write executed.
- No Auth operation executed.
- No RLS/RPC/migration change executed.
- No commit, push, OTA, or APK operation executed as part of this management audit.

## Final Status

| Item | Status |
|---|---|
| Founder OS management screens | IMPLEMENTED in current repository |
| Merchant create/edit/status/soft delete | IMPLEMENTED |
| Courier/Driver create/edit/status/soft delete | IMPLEMENTED |
| Customer management | IMPLEMENTED |
| Secure account provisioning | IMPLEMENTED through Edge Function |
| Ordinary-user access protection | PRESENT through RLS and server-side role check |
| Founder-only enforcement | NEEDS_DECISION; current policy is admin + founder |
| Permanent Auth + DB deletion | NEEDS_DECISION; not safe to implement generically |
| Database changes in this audit | NONE |
| RLS changes in this audit | NONE |
| Auth changes in this audit | NONE |
| RPC changes in this audit | NONE |
| Operational code changes in this audit | NONE after removal of redundant local addition |
| Commit | NOT RUN |
| Push | NOT RUN |
| OTA | NOT RUN |
| APK | NOT RUN |

## Recommended Next Step

اعتماد قرار مكتوب حول نطاق الدور الإداري (`founder` فقط أم `admin` + `founder`) وسياسة الاحتفاظ بالبيانات قبل أي migration أو تعديل RLS أو إضافة hard delete. بعد ذلك يمكن تنفيذ اختبار قبول على حساب Founder حقيقي وحساب Merchant وDriver تجريبيين، مع التحقق من أن المستخدم العادي لا يستطيع تنفيذ أي عملية إدارية عبر Supabase مباشرة.
