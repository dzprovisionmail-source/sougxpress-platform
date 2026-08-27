# Store Open Status Fix Report

## النطاق

تم تنفيذ تدقيق وإصلاح لمنطق عرض حالة فتح وإغلاق المتاجر في Soug-XPRESS. التغيير محصور في توحيد قراءة `stores.status` وساعات العمل واليوم المغلق الاختياري، مع تطبيق migration المطلوبة على Supabase staging فقط.

تم تطبيق migration schema المطلوبة على Supabase staging فقط. لم تُنفّذ أي كتابة تشغيلية أو إدخالات اختبار على بيانات المتاجر، ولم يُنفّذ OTA أو APK أو EAS Submit.

## نتيجة التدقيق

كان السوق وبطاقات المتاجر وصفحة تفاصيل المتجر تستخدم مصادر مختلفة للحالة. كانت `StoreCard` تعتمد على `isOpen` أو `store.is_open` أو حالة `status`، بينما كانت صفحة التفاصيل تعرض الحالة اعتمادًا على `store.is_open !== false`. هذا لا يحسب الساعات الفعلية ولا يميز بين متجر مغلق فعلًا ومتجر لم تُضبط له ساعات العمل.

كما أن شاشة إعدادات متجر التاجر كانت تعرض ساعات افتراضية `09:00 - 21:00` عند غياب القيم الفعلية، وهو عرض مضلل لا يعكس إعدادات قاعدة البيانات.

أظهر التدقيق read-only لمخطط وبيانات `stores` أن أعمدة الحالة والساعات الحالية متاحة. أُضيف العمود `closed_day` عبر migration `20260827150000_add_stores_closed_day.sql` على Supabase staging، ثم تم التحقق من نوعه وقابليته لـNULL والقيد الخاص بأيام الأسبوع وسجل migration.

## التنفيذ

### الحاسبة الموحدة

أُضيف الملف التالي:

`apps/mobile/src/services/store-open-state.ts`

وتقوم الحاسبة بما يلي:

| الحالة | النتيجة المعروضة |
|---|---|
| `status` يمثل حالة إدارية غير متاحة مثل `draft`, `pending`, `paused`, `suspended`, `inactive` أو `disabled` | `غير متاح إداريًا` |
| يوجد يوم مغلق يطابق اليوم الحالي | `مغلق الآن` |
| توجد ساعات يومية صالحة | تُحسب الحالة من الوقت الحالي، مع دعم الفترة الممتدة بعد منتصف الليل |
| توجد `opens_at` و`closes_at` صالحتان | تُحسب الحالة من النطاق الزمني العام |
| لا توجد ساعات صالحة، بغض النظر عن `is_open` | `ساعات العمل غير محددة` |
| توجد ساعات صالحة مع `is_open=false` | تُحسب الحالة من الساعات، ولا يُستخدم العلم القديم كبديل |

تدعم الحاسبة صيغ ساعات يومية شائعة مثل `opening_hours.monday`, المفاتيح الرقمية، أسماء الأيام الإنجليزية المختصرة، والأسماء العربية، إضافة إلى صيغ `open/close` و`opens_at/closes_at`. ويأخذ `closed_day` المركزي أولوية قبل أي جدول ساعات قديم، بينما تبقى قراءة صيغ `day_off` القديمة للتوافق فقط.

يُعاد حساب الحالة كل دقيقة عبر `useStoreOpenState` حتى تتغير الشارة تلقائيًا عند عبور وقت الفتح أو الإغلاق أثناء بقاء الشاشة مفتوحة.

### Market وStoreCard

تم تعديل:

`apps/mobile/src/components/ui/StoreCard.tsx`

ليستخدم الحاسبة الموحدة. لم يعد يعرض بطاقة المتجر حالة مبنية على fallback متعارض. الحالات المعروضة هي `مفتوح الآن` أو `مغلق الآن` أو `غير متاح إداريًا` أو `ساعات العمل غير محددة`، مع لون محايد للحالة غير المحددة. وتُستخدم `غير متاح إداريًا` عندما تكون حالة المتجر غير `active`، بدل وصفها كإغلاق زمني.

وتم تعديل:

`apps/mobile/src/app/(tabs)/home.tsx`

لتمرير كائن المتجر الكامل إلى `StoreCard` بدل تمرير قيمة `isOpen` مشتقة من `store.is_open` أو `status` فقط.

### Store Details

تم تعديل:

`apps/mobile/src/app/store-details.tsx`

لتستخدم الحاسبة نفسها والـhook الزمني نفسه في شارة حالة المتجر. بذلك تتطابق صفحة التفاصيل مع بطاقة المتجر بدل أن يكون لكل شاشة تفسير مختلف للحالة.

### إعدادات متجر التاجر

تم تعديل:

`apps/mobile/src/app/merchant/store.tsx`

لإزالة عرض الساعات الافتراضية. عند نقص `opens_at` أو `closes_at` تظهر `ساعات العمل غير محددة` بدل إظهار وقت غير محفوظ فعليًا. كما أصبح إدخال وقت الفتح ووقت الإغلاق مطلوبًا عند إنشاء متجر أو حفظ تعديلاته من النموذج. وأضيف اختيار `closed_day` اختياري باستخدام `SimpleSelect` نفسه، مع خيار `لا يوجد`. تُحفظ القيمة عبر `createStore` و`updateStore` عند توفر العمود في قاعدة البيانات.

## سلوك الوقت والحالات الخاصة

تم دعم النطاقات العادية مثل `09:00 - 18:00`، والنطاقات التي تعبر منتصف الليل مثل `22:00 - 02:00`. عند تطابق وقت الفتح والإغلاق يُعامل النطاق كمتجر مفتوح طوال اليوم، وفق تفسير إعدادات الساعات الحالية.

إذا كانت الساعات مفقودة، فلا يُستنتج أن المتجر مغلق. هذا يمنع ظهور جميع المتاجر كمغلقة بسبب نقص بيانات الإعدادات، ويعرض حالة محايدة قابلة للمراجعة.

## الفحوص المحلية

| الفحص | النتيجة |
|---|---|
| `git diff --check` | PASS |
| TypeScript العام | FAIL بسبب أخطاء سابقة خارج نطاق الإصلاح |
| TypeScript في الملفات المعدلة | لا توجد أخطاء مرتبطة بـ`store-open-state`, `StoreCard`, `home.tsx`, `store-details.tsx` أو `merchant/store.tsx` |
| التحقق من fallback القديم في Market وStore Details | PASS؛ لم يبقَ استخدام مباشر للحالة القديمة في هذه المسارات |
| Database operational writes | NOT EXECUTED؛ لم تُعدّل صفوف المتاجر |
| Migration | APPLIED TO SUPABASE STAGING / VERIFIED |

أخطاء TypeScript المتبقية محصورة في ملفات سابقة مثل `favorites.tsx`, `orders-courier.tsx`, `founder/activity-control.tsx`, `useAdminProfile.ts`, `useStores.ts` و`promotional-views.service.ts`، ولا ترتبط بالتغيير الحالي.

لم تظهر أخطاء ضمن الملفات المعدلة بعد إعادة الفحص. كما لم تُظهر المطابقة النصية أي fallback قديم من نوع `store.is_open` أو حقن `09:00`/`21:00` داخل المسارات المستهدفة.

## الملفات المعدلة

- `apps/mobile/src/services/store-open-state.ts` — ملف جديد.
- `apps/mobile/src/components/ui/StoreCard.tsx`.
- `apps/mobile/src/app/(tabs)/home.tsx`.
- `apps/mobile/src/app/store-details.tsx`.
- `apps/mobile/src/app/merchant/store.tsx`.
- `apps/mobile/src/services/store.service.ts` — تمرير `closed_day` في إنشاء المتجر.
- `apps/mobile/src/types/schema-03-core.ts` — إضافة الحقل الاختياري إلى النوع المحلي.
- `supabase/migrations/20260827150000_add_stores_closed_day.sql` — migration مطبقة ومتحقق منها على Supabase staging.
- `STORE_OPEN_STATUS_FIX_REPORT.md` — هذا التقرير.

## ملاحظات حول يوم الإغلاق

تمت إضافة العمود `closed_day` إلى `public.stores` في Supabase staging عبر migration `20260827150000_add_stores_closed_day.sql`. التحقق read-only أثبت `data_type = text` و`is_nullable = YES` ووجود `stores_closed_day_check` للقيم السبعة أو `NULL`. لم تُجرَ أي bulk update للمتاجر الحالية؛ ظل عدد الصفوف 42 بعد الفحص. الحاسبة تحتفظ بتوافق قراءة day-off legacy داخل `opening_hours` فقط.

## الملفات غير المرتبطة المحفوظة

بقيت التغييرات السابقة غير المرتبطة في `working tree` دون staging أو تعديل مقصود، ومنها تغييرات `favorite.service.ts`, `admin/setup.tsx`, إعدادات الحزم، تقارير التدقيق السابقة، وmigration إصلاح RLS للملفات الشخصية.

## القيود

> تم تطبيق Database Deployment لهذه migration وحدها على Supabase staging، دون تعديل RLS أو Auth أو RPC ودون تغيير بيانات المتاجر التشغيلية. لم يتغير المنطق المالي أو الطلبات أو المفضلة أو الاشتراكات أو Commercial Launch.

`COMMIT: PENDING FINAL GIT VERIFICATION`

`PUSH: PENDING FINAL GIT VERIFICATION`

`OTA: NOT RUN`

`APK: NOT RUN`

`REMOTE DATABASE DEPLOYMENT: PASS — SUPABASE STAGING ONLY`
