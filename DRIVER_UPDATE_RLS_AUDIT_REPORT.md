# تقرير تدقيق وإصلاح تحديث سجل السائق

## النطاق والقيود

تم تنفيذ هذا العمل كتدقيق وإصلاح لمشكلة رفض تحديث سجل السائق برسالة `42501` من Supabase. بعد اكتمال التحقق المحلي، طُبقت migration المطلوبة على مشروع Supabase staging المحدد فقط. لم يُنفذ commit أو push أو OTA أو APK أو أي نشر.

## النتيجة التنفيذية

السبب الجذري هو سياسة RLS الحالية `public.rls_update_drivers`، وبالتحديد فرع `WITH CHECK` الخاص بالسائق العادي. السياسة كانت تقارن `status` مع استعلام فرعي يستخدم الشرط:

```sql
WHERE d2.id = id
```

داخل الاستعلام الفرعي، أصبح `id` غير مؤهل ويُفسَّر عمليًا على أنه `d2.id`، ولذلك تحوّل الشرط إلى مقارنة ذاتية (`d2.id = d2.id`) واختار أول سجل يطابق القراءة، بدل مقارنة السجل المعدّل بالسجل نفسه. عند تحديث سائق لحقل مثل `availability` أو `avatar_url`، كان Supabase يعيد رفض `WITH CHECK` إذا لم تتطابق حالة السجل مع الحالة التي أعادها ذلك الاستعلام غير المحدد.

هذا يفسر لماذا يفشل تحديث ملف السائق حتى عندما لا يحاول التطبيق تغيير `status`. الخطأ ليس ناتجًا عن نوع `driverId` في الواجهة، ولا عن تغيير متعمد في الحالة الإدارية، ولا عن مشكلة في المفتاح الأجنبي؛ بل عن سياسة RLS غير صحيحة.

## التدقيق الفعلي

| البند | النتيجة |
|---|---|
| المشروع | `pmxydehrctwvawjbhrhl` — Soug-XPRESS-Staging |
| الجدول | `public.drivers` |
| RLS | مفعّل |
| المفتاح الأساسي | `id` من نوع UUID |
| ملكية السجل | `drivers.id` مرتبط بـ `auth.users.id` عبر `drivers_id_fkey` |
| سياسة التحديث | `rls_update_drivers` |
| السياسة الحالية قبل الإصلاح | تسمح للمالك أو admin/founder عبر `USING`، لكن `WITH CHECK` للسائق يحتوي مقارنة غير مؤهلة |
| سبب 42501 | فشل شرط `WITH CHECK` أثناء تقييم الصف الجديد |

تمت مطابقة schema الفعلية في staging مع تعريفات migrations المحلية. يحتوي جدول `drivers` على حقول الملف الشخصي مثل `full_name`, `phone`, `bio`, `avatar_url`, `vehicle_photo_url`, `vehicle_make`, `vehicle_color`, `city`, `neighborhood`، وعلى `availability` و`status`. كما أن `status` و`availability` مقيدان بقيم مسموحة، ولا توجد مشكلة في نوع الحقول التي يرسلها التطبيق في call sites التي تمت مراجعتها.

## مسار التطبيق

الدالة في `apps/mobile/src/services/driver.service.ts` تنفذ:

```ts
supabase
  .from("drivers")
  .update(updates)
  .eq("id", driverId)
  .select()
  .maybeSingle();
```

ويُمرر `driver.id` من `apps/mobile/src/hooks/useDriver.ts`. أما الاستخدامات الموجودة في واجهات السائق فتقتصر على حقول ملف شخصي أو `availability`، ومنها:

- `apps/mobile/src/app/driver/profile.tsx`: تحديث `availability`, `avatar_url`, `vehicle_photo_url` وحقول الملف الشخصي.
- `apps/mobile/src/app/driver/dashboard.tsx`: تحديث `availability`.
- `apps/mobile/src/hooks/useDriver.ts`: يمرر `driver.id` كمعرّف الصف إلى الخدمة.

لم تظهر في call sites التي تمت مراجعتها محاولة مقصودة لتعديل `id` أو `status` بواسطة سائق عادي.

## الإصلاح المحلي

### 1. حماية الخدمة

تم تعديل `apps/mobile/src/services/driver.service.ts` بحيث ترفض الخدمة محليًا أي payload يحتوي على `updates.id`. السبب أن `id` ليس حقل ملف شخصي؛ بل هو مفتاح الملكية نفسه ومرجع `auth.users`. هذا يمنع واجهة أو استدعاء مستقبليًا من محاولة نقل ملكية سجل السائق أو تغيير مفتاحه.

### 2. تصحيح RLS عبر migration محلية

تم إنشاء الملف التالي:

```text
supabase/migrations/20260827170000_fix_driver_update_rls.sql
```

الإصلاح يعيد إنشاء `rls_update_drivers` مع الحفاظ على قواعد العمل:

- admin/founder يستطيعان تحديث السجلات مع حالات `status` المسموحة.
- السائق يستطيع تحديث سجله المملوك له فقط.
- السائق لا يستطيع تغيير `status` الإداري.
- تُقارن حالة السجل الحالي باستخدام مرجع مؤهل صراحةً إلى `public.drivers.id` بدل المقارنة الغامضة.
- لا يتم تغيير RLS أو Auth أو RPC أو البيانات التشغيلية الأخرى خارج هذه السياسة.

تم تطبيق هذه migration على staging بعد اجتياز الفحوص المحلية. سجل staging أظهر migration باسم `fix_driver_update_rls` بإصدار تطبيقي `20260827164602`. لم تُطبق على production.

## التحقق المحلي

| الفحص | النتيجة |
|---|---|
| `git diff --check` | PASS، exit code 0 |
| فحص المسافات الزائدة للملفات المعدلة | PASS |
| TypeScript للمشروع | لم ينجح بالكامل بسبب 24 خطأ موجودًا في ملفات أخرى |
| أخطاء ضمن `driver.service.ts` أو `useDriver.ts` أو شاشة السائق | لا توجد أخطاء ضمن النطاق المعدل |
| اختبار كتابة فعلي على Supabase | تم عبر جلسة سائق staging مصادق عليها، مع إعادة القيم الأصلية |
| تطبيق migration على Supabase staging | PASS — `fix_driver_update_rls`, version المسجل `20260827164602` |
| تحقق وجود السياسة بعد التطبيق | PASS |
| عدد سياسات UPDATE على `public.drivers` | PASS — سياسة واحدة فقط |
| تحقق RLS للجدول | PASS — مفعّل |
| اختبارات كتابة فعلية بهوية سائق مصادق عليها | PASS — الحالات A إلى E، مع تحقق الاستعادة invariants |
| commit | لم يُنفذ |
| push | لم يُنفذ |
| OTA / EAS Update | لم يُنفذ |
| APK / EAS Submit | لم يُنفذ |

أخطاء TypeScript البالغ عددها 24 ظهرت في ملفات غير مرتبطة، منها `favorites.tsx`, `orders-courier.tsx`, `founder/activity-control.tsx`, `useAdminProfile.ts`, `useStores.ts` و`promotional-views.service.ts`. لم تُعدّل هذه الملفات.

## الاختبار الوظيفي الحقيقي على staging

اُستخدمت جلسة تسجيل دخول بكلمة مرور لحساب سائق staging، دون استخدام `service_role` ودون تضمين JWT أو كلمة المرور في التقرير. تم تنفيذ التحديثات على سجل السائق، ثم إعادة `bio` و`availability` إلى القيم الأصلية والتحقق من الثوابت بعد ذلك.

| الاختبار | المتوقع | الفعلي | النتيجة |
|---|---|---|---|
| تحديث حقل مسموح (`bio`) | نجاح | accepted؛ ثم أُعيدت القيمة الأصلية بنجاح | PASS |
| تحديث `availability` | نجاح | accepted؛ `id` و`status` بقيا ثابتين | PASS |
| تغيير `status` الإداري | رفض بواسطة RLS | `42501: new row violates row-level security policy for table "drivers"`؛ لم يتغير السجل | PASS |
| تغيير `drivers.id` | رفض بواسطة RLS | `42501: new row violates row-level security policy for table "drivers"`؛ لم يتغير مفتاح الملكية | PASS |
| تعديل سجل سائق آخر | رفض بواسطة RLS | `no row returned` من PostgREST بسبب تصفية الصف بواسطة RLS؛ لم يتغير السجل الآخر | PASS |
| التحقق بعد الاختبارات | عدم وجود تجاوز | `id_unchanged=true`, `status_unchanged=true`, `bio_restored=true`, `availability_restored=true`, `other_unchanged=true` | PASS |

الاختبار أثبت السلوك التشغيلي من جلسة سائق فعلية: الحقول المسموحة و`availability` قابلة للتحديث، بينما `status` و`id` وتحديث سجل سائق آخر مرفوضة. نتيجة `no row returned` في اختبار السائق الآخر هي سلوك PostgREST المتوقع عند عدم إرجاع صف قابل للتحديث، وليست نجاحًا أمنيًا.

## حالة المستودع

التغييران المرتبطان بهذه المهمة هما:

```text
apps/mobile/src/services/driver.service.ts
supabase/migrations/20260827170000_fix_driver_update_rls.sql
```

توجد في working tree تغييرات وتقارير سابقة غير مرتبطة، مثل تغييرات `favorite.service.ts` وملفات تقارير وmigrations أخرى. لم تُحذف أو تُعدّل أو تُضمّن في أي commit.

## ملاحظات قبل النشر

تم التحقق read-only من السياسة الفعلية بعد التطبيق: `USING` يقصر الوصول على مالك السجل أو admin/founder، و`WITH CHECK` يستخدم مراجع مؤهلة صراحةً، ويثبت `id = auth.uid()` للسائق، ويقارن `status` بحالة سجل المستخدم الحالية. كما ثبت أن public.drivers يحتوي على سياسة UPDATE واحدة فقط، فلا توجد سياسة أخرى تمنح صلاحية أوسع.

أكد الاختبار الوظيفي المصادق عليه الحالات الخمس المطلوبة، وتمت إعادة القيم الاختبارية إلى الأصل بنجاح. JWT/session استُخدمت داخليًا فقط ولم تُسجل أو تُعرض. حساب الاختبار كان سائق staging، ومعرّف المستخدم لا يُدرج في هذا التقرير لتقليل كشف بيانات الحساب.

نتيجة الاختبار الوظيفي: تحديث `bio` و`availability` نجحا، تغيير `id` و`status` رُفضا بـ`42501`، وتحديث سجل سائق آخر لم يُرجع صفًا ولم يغير السجل، وهو الرفض المتوقع تحت RLS.

> **الخلاصة:** تم تحديد السبب الجذري، وتصحيح الخدمة محليًا، وتطبيق migration على staging، والتحقق البنيوي والوظيفي المصادق عليه من سياسة RLS. نجحت الحالات A–E، وأُعيدت القيم الأصلية بنجاح. لا توجد سياسة UPDATE إضافية أو تجاوز صلاحيات مثبت في الاختبار.
