# Audit دخول Founder/Admin

## النطاق والنتيجة العامة

هذا Audit قراءة فقط لمسار الدخول من الشاشة الأولى حتى `/founder`. لم تُعدّل ملفات التطبيق، ولم تُنفّذ Database أو RLS أو Auth changes أو Build أو OTA أو Commit أو Push.

النتيجة: **هناك مسار برمجي واضح يمكنه إفساد دخول Founder/Admin حتى بعد إصلاح قبول الدور `admin`**. الإصلاح في commit `315cdc694d137e6965857b5f887d4cff3237e2da` وسّع شرط الدور في `index.tsx` من `founder` فقط إلى `founder/admin`، لكنه أبقى تبديل الجلسة عبر `signOut()`، مع وجود مستمع عام في `_layout.tsx` ينفّذ `router.replace("/")` عند كل `SIGNED_OUT`. هذا يخلق سباقاً بين إعادة التوجيه إلى الجذر وبين `router.replace("/founder")` بعد نجاح تسجيل الدخول.

## INITIAL SCREEN

الشاشة الأولى الفعلية هي `apps/mobile/src/app/index.tsx` عند المسار `/`. لا توجد فيها قائمة أدوار ظاهرة؛ يوجد زر رئيسي واحد بعنوان **«الدخول إلى السوق»**.

الدخول الإداري ليس ظاهراً كخيار مستقل. النص القابل للنقر في التذييل هو `Soug-XPRESS`، ويفتح Modal مخفياً لتسجيل Founder/Admin. لذلك فإن الشاشة الأولى الحالية لا تعرض للمستخدم العادي أزرار Customer/Merchant/Driver مباشرة.

| العنصر | الملف والسطر | السلوك |
|---|---|---|
| الشاشة الأولى | `apps/mobile/src/app/index.tsx:51` | Entry screen للمسار `/` |
| دخول السوق | `index.tsx:130-140` | يستدعي `getAuthenticatedEntryRoute()`، وإلا يرسل إلى `/login` |
| فتح دخول الإدارة | `index.tsx:193-197` | الضغط على نص `Soug-XPRESS` يفتح Modal مخفياً |
| Modal الإدارة | `index.tsx:205-346` | بريد، كلمة مرور، زر دخول وإلغاء |

## ROLE SELECTION

`apps/mobile/src/app/login.tsx` هو Gateway لاختيار النية/الدور، ويُفتح بعد الضغط على «الدخول إلى السوق» عندما لا توجد جلسة صالحة. الخيارات الحالية هي:

| الخيار | المسار |
|---|---|
| أريد التسوق | `/customer-auth` |
| أريد بيع منتجاتي | `/merchant-auth` |
| أريد العمل كموصل | `/driver-auth` |
| استكشف السوق أولاً | `/guest-marketplace` |

لا يوجد خيار Admin أو Founder في `login.tsx`. كما أن `login.tsx:69-87` يفحص الجلسة الحالية أولاً، وإذا وجد دوراً إدارياً صالحاً فإن `getAuthenticatedEntryRoute()` يعيده إلى `/founder` قبل عرض قائمة الأدوار.

## ADMIN ENTRY PATH

المسار الحالي لدخول الإدارة هو:

```text
/ (index.tsx)
  ↓ الضغط على نص Soug-XPRESS المخفي
Founder Login Modal
  ↓ supabase.auth.signOut()
_root layout: SIGNED_OUT → router.replace("/")
  ↓ supabase.auth.signInWithPassword()
  ↓ select profiles.role بواسطة authData.user.id
  ↓ قبول role إذا كان founder أو admin فقط
  ↓ router.replace("/founder")
  ↓ founder/_layout.tsx
  ↓ useAdminProfile()
  ↓ getUser() + select profiles
  ↓ authorized=true
  ↓ FounderControlCenterScreen
```

يوجد مسار بديل للمستخدم الإداري الذي لديه جلسة قائمة:

```text
/ أو /login
  ↓ getAuthenticatedEntryRoute()
profiles.role = founder/admin
  ↓ router.replace أو router.push("/founder")
```

## EXACT BLOCKING POINT

### نقطة المنع الأساسية المحددة في الكود

النقطة الأخطر هي التفاعل بين:

- `apps/mobile/src/app/index.tsx:90-97`، حيث يُنفّذ `await supabase.auth.signOut()` قبل تسجيل دخول الإدارة.
- `apps/mobile/src/app/_layout.tsx:58-68`، حيث يستمع التطبيق إلى `SIGNED_OUT` ويُنفّذ بلا شرط أو إلغاء:

```ts
if (event === "SIGNED_OUT") {
  // release token...
  router.replace("/");
}
```

- ثم `index.tsx:121-123`، حيث يحاول مسار تسجيل الدخول بعد نجاح فحص الملف الشخصي تنفيذ `router.replace("/founder")`.

لا يوجد تنسيق أو حارس يمنع إعادة توجيه `SIGNED_OUT` القديمة من الوصول بعد بدء تسجيل الدخول الجديد. وبما أن `router.replace("/")` غير متزامن وغير ملغى، يمكن أن تتغلب إعادة التوجيه العامة إلى `/` على الانتقال إلى `/founder`، أو تتسبب في إعادة تركيب Entry screen وإغلاق Modal قبل اكتمال المسار. هذا يفسر لماذا لم يكن توسيع شرط الدور إلى `admin` وحده كافياً.

### نقطة منع ثانية، مشروطة ببيانات/سياسة البيئة

حتى إذا لم يقع السباق، فإن `index.tsx:107-113` يرفض الدخول عند أي من الحالات التالية:

1. لا توجد صفٌّ مطابق في `public.profiles` للـ Auth user ID.
2. استعلام `profiles` يرجع خطأ، بما في ذلك خطأ شبكة أو جلسة أو صلاحية قراءة.
3. قيمة `profiles.role` ليست حرفياً `"admin"` أو `"founder"`.

في هذه الحالات ينفّذ `index.tsx:115` تسجيل خروج آخر، ثم يعرض رسالة **«ليس لديك صلاحية دخول منطقة المؤسس»**. لا يعرض الكود سبب استعلام Supabase الحقيقي، لذلك قد تظهر مشكلة صلاحيات/شبكة للمستخدم كأنها رفض دور.

بعد الوصول إلى `/founder` يوجد فحص ثانٍ في `apps/mobile/src/hooks/useAdminProfile.ts:34-69`. هذا الفحص يستخدم `getUser()` ثم `.single()` على `profiles`. عند غياب الجلسة أو الصف أو حدوث خطأ يعيد المستخدم إلى `/login` في السطرين 42 و57. وعند قيمة دور غير مطابقة يعيده إلى `/(tabs)/home` في السطر 64. لذلك فإن أي مشكلة في قراءة `profiles` قد تظهر كإعادة توجيه بعيداً عن Founder حتى لو نجح Auth.

## ROOT CAUSE

**السبب الجذري البرمجي المرجح هو إعادة تسجيل الخروج القسري قبل دخول الإدارة، مع إعادة توجيه عامة غير مشروطة من RootLayout عند حدث `SIGNED_OUT`.** الإصلاح السابق عالج فقط قبول قيمة الدور `admin` في فحص `index.tsx`، ولم يعالج سباق الجلسة/الملاحة.

هناك عامل UX مستقل يزيد احتمال فشل الاستخدام: مدخل الإدارة مخفي داخل نص صغير في التذييل، وليس رابطاً واضحاً. هذا لا يمنع المصادقة تقنياً إذا تم الضغط عليه، لكنه يجعل المسار الإداري غير قابل للاكتشاف تقريباً.

لا يمكن من Audit ساكن وحده إثبات أي من السباق أو خطأ `profiles` حدث فعلاً في جهاز المستخدم دون سجلات الجهاز أثناء الضغط أو اختبار مباشر بالحساب. لذلك يجب اعتبار فحص role/query ونتيجة `getUser()` في نسخة تشخيصية الخطوة اللازمة لإثبات الفرع النهائي قبل اعتماد الإصلاح.

## PREVIEW / IDENTITY ANALYSIS

منطق `preview` و`identity=soug-admin` لا يظهر كحاجز على مسار Auth أو `/founder`:

| الملف | النتيجة |
|---|---|
| `guest-marketplace.tsx:3-13` | يحوّل فقط إلى شاشة السوق مع تمرير معاملات السوق |
| `(tabs)/home.tsx:91-94` | يفسر `identity=soug-admin` كسياق هوية منصة داخل السوق |
| `useMarketPresence.ts:24-33` | يتجاهل `preview=1` و`soug-admin`، ويتجاهل founder/admin من التتبع |
| `store-details.tsx` و`product-details.tsx` | تمرر سياق السوق عند وجوده، ولا تعيد توجيه Auth إلى Founder |
| `_layout.tsx` | لا يحتوي أي شرط `preview` أو `identity`؛ التأثير الإداري فيه من `SIGNED_OUT` فقط |

**الاستنتاج:** `preview` و`identity=soug-admin` ليسا سبب المنع المباشر لدخول الإدارة. يجب عدم خلط هوية `soug-admin` العامة داخل السوق مع دور `admin/founder` في `profiles`؛ فهما مساران مختلفان.

## هل يحل التصميم المقترح المشكلة؟

التصميم المقترح — شاشة أولى بثلاثة أدوار عامة ورابط سفلي صغير بعنوان **«دخول الإدارة»** — يحل مشكلة قابلية الاكتشاف ويزيل الاعتماد على الضغط على اسم العلامة التجارية. لكنه **لن يحل وحده سبب السباق**؛ يجب أن يستخدم مساراً إدارياً واضحاً مع معالجة انتقال الجلسة أو منع إعادة التوجيه العامة أثناء عملية Founder login.

الأفضل من ناحية تجربة الاستخدام أن يبقى Admin/Founder خارج قائمة الأدوار العامة، مع رابط سفلي صريح ينقل إلى شاشة Login إدارية مستقلة أو Modal مصمم لذلك. بعد نجاح Auth وفحص `profiles.role` يجب الانتقال إلى `/founder`، ثم يظل `useAdminProfile` هو الحارس النهائي.

## FILES THAT WOULD NEED MODIFICATION

إذا تم اعتماد التصميم لاحقاً، فالحد الأدنى المتوقع هو:

| الملف | الحاجة |
|---|---|
| `apps/mobile/src/app/index.tsx` | استبدال المدخل المخفي برابط «دخول الإدارة»، أو إزالة Modal الحالي، وربط المسار الجديد. كما يلزم هنا إصلاح تسلسل session/navigation إن بقيت المصادقة في هذه الشاشة. |
| `apps/mobile/src/app/login.tsx` | مطلوب فقط إذا أُريد أن تكون شاشة اختيار الدور هي التي تعرض رابط الإدارة؛ أما إذا بقي الرابط في Entry screen فلا يلزم تعديل هذا الملف للتصميم. |
| `apps/mobile/src/app/admin-auth.tsx` أو شاشة إدارية مستقلة جديدة | خيار أنظف لفصل Login الإدارة عن AuthScreen العامة؛ لا يُنشأ إلا بعد اعتماد التصميم. |
| `apps/mobile/src/app/_layout.tsx` | مطلوب فقط إذا تقرر تعديل سلوك إعادة التوجيه عند `SIGNED_OUT` لمنع السباق؛ هذا تعديل Auth navigation محلي، وليس تغييراً في Supabase Auth configuration. |
| `apps/mobile/src/services/auth-entry.service.ts` | لا يحتاج تعديلاً مبدئياً؛ فهو يقبل `admin` و`founder` ويرجع `/founder` بالفعل. لا يُعدل إلا إذا تغيرت سياسة مسارات الأدوار المعتمدة. |
| `apps/mobile/src/hooks/useAdminProfile.ts` | لا يحتاج تعديلاً مبدئياً؛ الحارس يقبل `admin` و`founder` بالفعل. |
| `apps/mobile/src/app/founder/_layout.tsx` | لا يحتاج تعديلاً؛ الحماية الحالية صحيحة من حيث قبول الدورين. |

## خلاصة التدقيق

| البند | النتيجة |
|---|---|
| INITIAL SCREEN | `/` عبر `index.tsx`، زر سوق واحد ومدخل إدارة مخفي في التذييل |
| ROLE SELECTION | `/login`، Customer/Merchant/Driver/Guest فقط |
| ADMIN ENTRY PATH | Footer hidden Modal → signOut → signInWithPassword → profiles.role → `/founder` |
| EXACT BLOCKING POINT | سباق `SIGNED_OUT → router.replace("/")` مع `router.replace("/founder")`، مع احتمال فشل query الدور كفرع ثانٍ |
| ROOT CAUSE | إصلاح الدور السابق لم يعالج تبديل الجلسة وإعادة التوجيه العامة؛ والمدخل مخفي UX-wise |
| PROPOSED ADMIN ENTRY | رابط سفلي واضح «دخول الإدارة» خارج أدوار المستخدمين العامة، مع مسار إداري منفصل ومعالجة السباق |
| DATABASE | UNCHANGED |
| RLS | UNCHANGED |
| AUTH | UNCHANGED |
| FILES MODIFIED | NONE by this audit |
| COMMIT | NOT RUN |
| PUSH | NOT RUN |
| OTA | NOT RUN |
| APK | NOT RUN |

## حالة شجرة العمل

كانت هناك تغييرات محلية سابقة غير مرتبطة عند بدء التدقيق، منها تعديلات في `package.json` و`pnpm-lock.yaml` و`pnpm-workspace.yaml` و`apps/mobile/eas.json` وملف migration وملف Audit آخر. لم تُحذف أو تُعدّل أو تُدخل في أي Commit خلال هذا التدقيق.

## مراجع الملفات

[1]: `apps/mobile/src/app/index.tsx`
[2]: `apps/mobile/src/app/login.tsx`
[3]: `apps/mobile/src/services/auth-entry.service.ts`
[4]: `apps/mobile/src/app/_layout.tsx`
[5]: `apps/mobile/src/hooks/useAdminProfile.ts`
[6]: `apps/mobile/src/app/founder/_layout.tsx`
[7]: `apps/mobile/src/app/guest-marketplace.tsx`
[8]: `apps/mobile/src/app/(tabs)/home.tsx`
[9]: `apps/mobile/src/hooks/useMarketPresence.ts`
