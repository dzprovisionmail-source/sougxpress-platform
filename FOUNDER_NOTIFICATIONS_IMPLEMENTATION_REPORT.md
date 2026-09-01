# تقرير تنفيذ Founder Notifications وTrial Auto-Approval

## الحالة

تم تحديث المستودع من `origin/main`، وكانت النسخة عند `47cf53f`. تم تنفيذ التدقيق والإصلاحات محليًا فقط. لم يتم تنفيذ `git commit` أو `git push`، ولم يتم إنشاء APK أو OTA أو Production Build، ولم تُطبّق migration على قاعدة Supabase.

## 1. هندسة الإشعارات الحالية

المسار الموحد أصبح:

```text
Event
  ↓
Database trigger / existing notification service
  ↓
Recipient resolver
  ├── Customer
  ├── Merchant
  ├── Driver
  └── Founder/Admin
  ↓
public.notifications
  ↓
Supabase Realtime
  ↓
useNotifications / notification state
  ↓
Badge
  ↓
Notification Center
  ↓
Deep link إلى مصدر الحدث
```

الجدول الحالي يستخدم `user_id` كمستلم، و`related_entity_type` و`related_entity_id` كمصدر، بينما تحمل `data` قيم `source_type` و`source_id` و`deep_link` و`priority`. لم تتم إضافة أعمدة جديدة.

الاشتراك الأمامي الموحد موجود في `notification.service.ts`، حيث يوجد channel واحد لكل مستخدم مع مجموعة listeners. يتم تسجيل `postgres_changes` قبل `subscribe()`، ولا تُزال القناة إلا بعد خروج آخر listener.

## 2. ما كان ناقصًا لدى Founder/Admin

كان `/admin/notifications` صفحة إعداد إرسال فقط، وليست مركزًا شخصيًا لعرض إشعارات المؤسس. كما أن triggers الإشعارات الحالية كانت تغطي المستلم التشغيلي للحدث، مثل العميل أو التاجر أو الموصل، دون fan-out إلى حسابات `founder` و`admin`.

كذلك كانت شاشة السائق تنشئ channel مستقلًا لإشعاراتها رغم وجود hook مركزي، فتم توحيدها مع `useNotifications` لمنع الاشتراك المكرر.

## 3. الأحداث المرتبطة بإشعارات المؤسس

أضيفت migration:

```text
supabase/migrations/20260901190000_founder_notifications_and_trial_events.sql
```

وتربط إشعارات Founder بالأحداث التالية عبر database triggers:

- إنشاء profile لحساب غير Founder/Admin.
- تسجيل عميل جديد.
- تسجيل تاجر جديد.
- تغير حالة التاجر، بما في ذلك التفعيل والتعطيل.
- تسجيل موصل جديد.
- تغير حالة الموصل، بما في ذلك التفعيل.
- إنشاء متجر جديد.
- تغير حالة متجر.
- إنشاء طلب جديد.
- تغير حالة الطلب، بما فيها القبول والرفض والإلغاء وأي حالة أخرى.
- إنشاء تعيين توصيل.
- تغير حالة التوصيل.
- إنشاء عملية مالية.

كل إشعار يحتوي منطقيًا على المستلم عبر `user_id`، ونوع الحدث، والعنوان، والنص، ومصدر العملية، والرابط المباشر، والأولوية، وحالة القراءة، وتاريخ الإنشاء باستخدام الحقول الحالية.

يُستخدم `event_key` الموجود أصلًا لمنع التكرار لكل Founder/Admin.

## 4. Badge المؤسس

تم تحديث `apps/mobile/src/app/founder/index.tsx` لإضافة زر مركز إشعارات المؤسس ضمن الإجراءات السريعة.

الـBadge لا يستخدم رقمًا ثابتًا؛ بل يعتمد على:

```ts
useNotifications().unreadCount
```

ويتم تحديثه من نفس مصدر Customer/Merchant/Driver. عند الضغط ينتقل المؤسس إلى:

```text
/founder/notifications
```

## 5. Founder Notification Center

تم إنشاء:

```text
apps/mobile/src/app/founder/notifications.tsx
```

ويحتوي على:

- قائمة حقيقية من Supabase.
- ترتيب الأحدث أولًا من خلال استعلام hook الحالي.
- تمييز الإشعار غير المقروء.
- `unreadCount` حقيقي.
- `markRead`.
- `markAllRead`.
- تحديث يدوي.
- تحديث Realtime.
- عرض نوع الحدث.
- فتح `deep_link` المخزن في `data`.
- عدم فقدان الصفوف بعد إعادة تشغيل التطبيق؛ لأنها تُجلب من قاعدة البيانات.

تم تسجيل route المركز في `apps/mobile/src/app/founder/_layout.tsx`.

كما تم تعديل route `(tabs)/notifications.tsx` لتوجيه Founder/Admin إلى شاشة Founder Center بدل صفحة إرسال الإدارة.

## 6. auto-approval للتجار

تم إنشاء خدمة مركزية:

```text
apps/mobile/src/services/trial-approval.service.ts
```

وقرار الحالة أصبح يمر عبر:

```ts
getRegistrationStatus("merchant")
```

عند تفعيل العلم، يُنشأ التاجر بحالة `active` بدل `pending_review`. وتبقى كل validations السابقة موجودة، بما فيها الاسم والهاتف واسم المتجر والمنطقة وRLS ومنع التعارض عبر `upsert`.

## 7. auto-approval للموصلين

يستخدم التسجيل:

```ts
getRegistrationStatus("driver")
```

بعد التحقق من نوع المركبة والحي والبيانات المطلوبة. عند تفعيل العلم يُنشأ الموصل بحالة `active`، وإلا تبقى الحالة `pending_review`.

تم أيضًا جعل المتجر الأول للتاجر متسقًا مع حالة التسجيل؛ فإذا كان التاجر `active` يكون المتجر الأول `active`، وإلا يبقى `pending`.

## 8. تعطيل auto-approval مستقبلًا

يمكن تعطيل كل دور دون تعديل شاشات التسجيل عبر متغيرات البيئة:

```text
EXPO_PUBLIC_TRIAL_AUTO_APPROVE_MERCHANTS=false
EXPO_PUBLIC_TRIAL_AUTO_APPROVE_DRIVERS=false
```

عندها تعود الخدمة إلى `pending_review`، وتبقى مسارات الموافقة اليدوية الموجودة في Founder محفوظة. القرار محصور في `trial-approval.service.ts` وليس موزعًا على عدة شاشات.

## 9. الملفات المعدلة أو المضافة

- `apps/mobile/src/app/(tabs)/notifications.tsx`
- `apps/mobile/src/app/driver/notifications.tsx`
- `apps/mobile/src/app/founder/_layout.tsx`
- `apps/mobile/src/app/founder/index.tsx`
- `apps/mobile/src/app/founder/notifications.tsx`
- `apps/mobile/src/components/auth/AuthScreen.tsx`
- `apps/mobile/src/services/trial-approval.service.ts`
- `supabase/migrations/20260901190000_founder_notifications_and_trial_events.sql`

## 10. TypeScript

**PASS**

تم تنفيذ:

```text
pnpm exec tsc --noEmit
```

دون أخطاء.

## 11. الاختبارات والفحوصات

| الفحص | النتيجة |
|---|---|
| تحديث Git والتبعيات | PASS |
| فحص commits المطلوبة | PASS |
| `git diff --check` | PASS |
| TypeScript | PASS |
| Expo web export | PASS |
| فحص ترتيب `postgres_changes` قبل `subscribe()` | PASS |
| فحص قناة إشعارات المستخدم المركزية | PASS |
| إزالة اشتراك السائق المكرر | PASS |
| فحص notification routing | PASS بالكود |
| فحص auto-approval paths | PASS بالكود |
| قاعدة البيانات الفعلية بعد migration | UNVERIFIED — migration لم تُطبّق |
| سلوك Supabase Realtime على البيئة الفعلية | UNVERIFIED |
| اختبار Founder/Merchant/Driver على Expo Go | UNVERIFIED |

## 12. ما يزال UNVERIFIED

لم يتم ادعاء اختبار Expo Go أو جهاز المستخدم.

قبل أن تنتج قاعدة البيانات إشعارات Founder، يجب تطبيق migration الجديدة على بيئة Supabase. بعد تطبيقها، يجب اختبار:

1. تسجيل تاجر جديد والتحقق من `active` أثناء التجربة.
2. تسجيل موصل جديد والتحقق من `active` أثناء التجربة.
3. وصول إشعار Founder/Admin من كل حدث.
4. تغير Badge عند وصول الإشعار.
5. فتح الإشعار والوصول إلى مصدره.
6. تعليم إشعار كمقروء وانخفاض العدد.
7. تعطيل Feature Flags والتحقق من عودة `pending_review`.
8. اختبار العميل والتاجر والموصل والمؤسس على Expo Go.

**Expo Go على جهاز المستخدم: UNVERIFIED — يحتاج اختبار المستخدم.**
