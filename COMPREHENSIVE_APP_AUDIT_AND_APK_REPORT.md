# Comprehensive App Audit and APK Report

**Project:** Soug-XPRESS
**Date:** 2026-08-27
**Author:** Manus AI
**Audit order:** AUDIT → COMPARE → CLASSIFY → FIX SAFE ISSUES → VERIFY → BUILD APK → VERIFY APK → WRITE REPORT

## Executive Summary

أُجريت مراجعة End-to-End للمستودع الحالي، مع استخدام `PROJECT_HISTORY_AND_SYSTEM_MAP.md` كمرجع تاريخي ومعماري، ثم مقارنة محتواه بالكود الفعلي، ومسارات Expo Router، والخدمات والـhooks، وملفات Supabase migrations، وschema staging، وتعريفات RPC المنشورة. كما تمت مراجعة الحالة المحلية قبل التغيير، وفحص إعدادات Expo/EAS، وتشغيل الفحوص المتاحة، ثم إنشاء APK Android جديد عبر profile `preview`.

النتيجة العامة هي أن التطبيق يملك أساساً تشغيلياً واسعاً يغطي أدوار Customer وMerchant وDriver/Courier وFounder/Admin، وأن السياسة المالية الحالية متسقة في الطبقات التي تمت مراجعتها: رسوم التوصيل `150 DZD`، حصة المنصة `0 DZD`، حصة الموصل `150 DZD / 100%`، اشتراك الموصل `500 DZD/month`، اشتراك التاجر `1000 DZD/month`، والشهر الأول كتجربة مجانية. بقيت أخطاء TypeScript baseline معروفة في ملفات متعددة؛ لم تُصنّف كـregression ولم تتم إعادة هندستها بصورة واسعة.

لم تُنفّذ أي كتابة في قاعدة البيانات أثناء التدقيق، ولم تُعدّل RLS أو Auth أو RPC أو migrations قديمة. كما لم يُنفّذ commit أو push أو OTA. التغييرات الموجودة مسبقاً في working tree حُفظت كما هي.

## Goals Comparison

| الهدف | الحالة | الدليل | المشكلة/الملاحظة | الإجراء |
|---|---|---|---|---|
| تطبيق سوق محلي متعدد الأدوار | IMPLEMENTED | Expo mobile app، مسارات الأدوار، Supabase services | بعض المسارات legacy أو متداخلة | توثيقها؛ لا حذف تلقائي |
| Customer marketplace والشراء | PARTIALLY_IMPLEMENTED | guest/auth marketplace، cart، checkout، orders | يلزم اختبار يدوي شامل بحساب Customer حقيقي لتأكيد كل حالات UI/Realtime | إبقاء كاختبار متابعة |
| Merchant store/order operations | PARTIALLY_IMPLEMENTED | merchant routes، store/product services، order management | وجود route لا يثبت اكتمال كل workflow؛ يلزم اختبار قبول فعلي | إبقاء كاختبار متابعة |
| Driver/Courier delivery workflow | PARTIALLY_IMPLEMENTED | driver routes، assignments، delivery services | مصطلح Driver هو الكيان الفعلي في schema؛ Courier مستخدم تجارياً في UI/policy | عدم خلط الكيانين؛ توثيق القرار |
| Founder/Admin OS | IMPLEMENTED with security constraints | `profiles.role`، admin/founder routes، guards وRPCs | query parameters مثل `preview=1` أو `identity=soug-admin` ليست Auth | إبقاء صلاحيات قاعدة البيانات كمصدر القرار |
| Commercial chat policy | IMPLEMENTED | `can_start_chat` و`get_or_create_chat_conversation` في Supabase | الرفض `P0001` صحيح عند غياب العلاقة المؤهلة | لا فتح عالمي للمحادثة |
| Favorites relationships | PARTIALLY_IMPLEMENTED | `customer_favorites`، `favorite_couriers`، `courier_favorites`، `merchant_favorites` | عدة نماذج صحيحة لكنها تحتاج اختبارات role-pair كاملة | عدم توحيدها بحذف غير مؤكد |
| Financial policy | IMPLEMENTED | `earnings.ts` وfinancial migration وlive schema audit | بعض الحقول legacy باقية للتوافق التاريخي | إبقاء legacy مع rate تشغيلي صفري |
| Realtime/Push | PARTIALLY_IMPLEMENTED | Supabase channels، `push-processor`، notification webhook | يلزم اختبار lifecycle ميداني لتسريبات الاشتراك وتوجيه الإشعارات | متابعة منفصلة |
| Media/uploads | IMPLEMENTED with limits | image optimizer، Storage paths، media constraints | يلزم اختبار Android لحالات الصور الكبيرة والفشل الشبكي | إبقاء الحدود الحالية |
| Arabic RTL UX | IMPLEMENTED in primary flows | Arabic strings، RTL screens، Expo layout | يلزم فحص بصري على أجهزة متعددة | متابعة QA بصري |
| Reproducible preview APK | IMPLEMENTED | `eas.json` profile preview | TypeScript baseline errors موثقة | APK built successfully |

## Customer Audit

تتضمن البنية الحالية مسارات المصادقة واكتشاف الدور وإعادة التوجيه إلى مساحة Customer/authenticated marketplace وفق الحالة الفعلية للمشروع، إلى جانب guest marketplace. توجد شاشات السوق والمتجر والمنتجات والسلة والعناوين والطلبات والمفضلة والإشعارات والإعدادات ضمن البنية الحالية أو ضمن الخدمات المشتركة ذات الصلة.

المسار التشغيلي المقصود هو: شاشة السوق ← مكونات المتجر والمنتجات ← hooks/services ← Supabase tables/RPCs ← RLS/triggers ← النتيجة المعروضة. تدعم السلة تعديل الكمية والحذف وحساب الإجمالي، ويُفرض رسم التوصيل الحالي في طبقة قاعدة البيانات عبر policy trigger بالإضافة إلى مصدر الثوابت في التطبيق. يلزم اختبار قبول يدوي بحساب Customer حقيقي لتأكيد حالات checkout الفارغة، العنوان غير المكتمل، الفشل الشبكي، وتغيّر حالة الطلب.

**Classification:** `PARTIALLY_IMPLEMENTED` من منظور اختبار قبول End-to-End، وليس دليلاً على غياب المسارات أو الخدمات.

## Merchant Audit

تحتوي مساحة Merchant على إدارة المتجر وبياناته والمنتجات ووسائط المتجر والصور والتصنيفات والعروض وإدارة الطلبات والتنسيق مع التوصيل والإشعارات والمفضلة والمحادثات والملف الشخصي. يعتمد الوصول إلى بيانات التاجر على Supabase/RLS ولا ينبغي اعتبار العرض المحلي بديلاً عن التفويض الخلفي.

اشتراك التاجر معروض كـ`1000 DZD/month` بعد التجربة المجانية، دون إنشاء تاريخ إطلاق ثابت أو countdown. يلزم اختبار يدوي مستقل للتأكد من أن إنشاء المنتج وتعديل الصور وتحديث حالة الطلب لا يسمحان بالوصول إلى متجر أو طلب تابع لحساب آخر.

**Classification:** `PARTIALLY_IMPLEMENTED` بسبب الحاجة لاختبار قبول مصادق عليه لكل workflow؛ لا توجد إشارة إلى تجاوز أمني مثبت في التدقيق الحالي.

## Driver/Courier Audit

الـschema يستخدم كيان `drivers`، بينما تستخدم السياسة والنصوص التجارية تسمية Courier/موصل. لا يجوز افتراض وجود كيان ثانٍ مستقل ما لم تثبته schema. تمت مراجعة profile، assignments، available assignments، قبول المهمة، تحديث حالات التوصيل، orders، earnings، notifications، favorites، chat، والاشتراك.

العلاقات الأساسية في قاعدة البيانات هي `courier_favorites` للمفضلة التي يملكها الموصل تجاه store/customer، و`favorite_couriers` للمفضلة التي يملكها مستخدم تجاه driver. القيد `courier_favorites_unique_target` هو `UNIQUE (courier_id, target_type, target_id)`، مع `target_type` محصور في `store` و`customer`.

تمت مراجعة قنوات Realtime المسماة `driver_profile` و`driver_assignments` و`available_assignments` بصورة منفصلة عن خطأ Favorites. لا يوجد دليل كافٍ على أن تحذيرات Realtime هي سبب duplicate-key في Favorites؛ لذلك لم تُجرَ تغييرات Realtime أو schema.

**Classification:** `PARTIALLY_IMPLEMENTED`; يلزم اختبار lifecycle فعلي للتأكد من cleanup وعدم تكرار subscriptions.

## Founder/Admin Audit

التفويض النهائي يجب أن يعتمد على Supabase Auth و`profiles.role` وRLS/RPC، وليس على query parameters. تم الحفاظ على الفصل بين Founder/Admin وبين أدوار السوق التجارية. لا تعتبر `preview=1` أو `identity=soug-admin` أو أي parameter مشابهاً وسيلة Auth أو privilege escalation.

Founder/Admin ليسا طرفين صالحين في commercial chat. كما أن RPC الأمني يستخدم المستخدم المصادق عليه (`auth.uid()`) وقواعد role-pair والعلاقة التجارية. تسجيل دخول Founder الرسمي عولج سابقاً لحساب البريد الرسمي، ولم يتم تغيير Auth configuration أثناء هذا التدقيق.

**Classification:** `IMPLEMENTED with security constraints`.

## Chat Audit

المسار `getOrCreateConversation()` في خدمة المحادثة يستدعي RPC المحادثة، بينما يرجع `P0001` من طبقة قاعدة البيانات عند رفض `can_start_chat`. القرار الأمني موجود في `can_start_chat` و`get_or_create_chat_conversation` المنشورين في Supabase والمتوافقين مع migration المحلية الأخيرة.

العلاقات التجارية المؤهلة تشمل Customer↔Merchant وCustomer↔Courier/Driver وMerchant↔Courier/Driver عندما تثبتها نماذج Favorites التجارية المدعومة أو علاقة طلب/توصيل نشطة حيث ينطبق ذلك. عند عدم وجود علاقة، رسالة `Unauthorized: No valid commercial relationship between users` متوقعة وليست سبباً لتعطيل الحماية.

**Classification:** `IMPLEMENTED`. Founder/Admin commercial chat: **BLOCKED**. RLS: **UNCHANGED**. RPC: **UNCHANGED during this audit**.

## Favorites Audit

توجد نماذج متعددة، وكل واحد منها له owner وtarget مختلفان:

| الجدول | المالك | الهدف | القيد الفريد |
|---|---|---|---|
| `customer_favorites` | Customer | target/product | `(customer_id, target_type, target_id)` وقيود المنتج |
| `favorite_couriers` | user/customer-side | Driver | `(user_id, courier_id)` |
| `courier_favorites` | Driver/Courier | store/customer | `(courier_id, target_type, target_id)` |
| `merchant_favorites` | Merchant | customer/courier | `(merchant_id, target_id, target_type)` |

خطأ `duplicate key value violates unique constraint courier_favorites_unique_target` سببه محاولة إدراج target موجود مسبقاً، عادةً بسبب ضغط متكرر أو طلبين متزامنين. الإصلاح المحلي الموجود في `apps/mobile/src/services/favorite.service.ts` يستخدم فحص الحالة ومعالجة تعارض الإدراج مع serialization محلي لكل target، ويحافظ على toggle semantics دون تعديل schema أو RLS أو RPC.

**Classification:** `PARTIALLY_IMPLEMENTED`; المنطق الأساسي والقيود موجودة، لكن concurrency بين clients مستقلين لا يمكن ضمانه بالكامل من خلال serialization محلي فقط. أي تحسين ذري شامل يحتاج قراراً منفصلاً حول RPC/database function.

## Financial Audit

مصدر الثوابت في `apps/mobile/src/constants/earnings.ts` يعرّف القيم بالـminor units:

| القيمة | Minor units | العرض التجاري | مصدر/طبقة الحقيقة |
|---|---:|---:|---|
| Delivery fee | `15000` | `150 DZD` | `earnings.ts` + `fn_apply_current_delivery_policy` |
| Platform delivery share | `0` | `0 DZD` | `earnings.ts` + DB trigger/settings |
| Driver share | `100%` من الرسم | `150 DZD` | `computeEarningsSplit` + DB policy |
| Driver subscription | `50000` | `500 DZD/month` | `earnings.ts` + `fn_subscription_price_for_role` |
| Merchant subscription | `100000` | `1000 DZD/month` | `earnings.ts` + `fn_subscription_price_for_role` |
| Trial | `1 month` | أول شهر مجاني | `SUBSCRIPTION_TRIAL_MONTHS` + `trial_end` |

الـmigration المالية تنشئ `account_subscriptions` بدورين `merchant` و`driver`، وتستخدم `trial_end = subscription_start + interval '1 month'` دون تاريخ إطلاق عالمي. كما تضع `delivery_fee_minor = 15000` و`platform_commission_minor = 0` عبر trigger وتحتفظ بالحقول القديمة للتوافق التاريخي. لم يتم تغيير أي قيمة مالية خلال هذا التدقيق.

**Classification:** `IMPLEMENTED`. أي اختلاف مستقبلي بين UI والـDB يجب إصلاحه عبر تحديد مصدر الحقيقة الفعلي، لا عبر تعديل نص واجهة فقط.

## Security Audit

تمت مراجعة حدود Auth وprofiles.role وRLS وsecurity-definer functions وRPC authorization وChat/Favorites وorders وassignments والجداول المالية بصورة قراءة فقط. لا توجد نتيجة مثبتة في هذا التدقيق تستدعي تعديل RLS أو Auth أو RPC قبل إصدار APK.

النقاط غير القابلة للتجاوز هي أن query parameters ليست Auth، وأن commercial chat لا يُفتح عالمياً، وأن `auth.uid()` وRLS/RPC هما مصدر التفويض. يجب إجراء اختبار IDOR مستقل على حسابات Customer وMerchant وDriver قبل أي إطلاق إنتاجي.

**Classification:** `IMPLEMENTED with QA follow-up`; لا توجد High/Critical إصلاحات أمنية جديدة مثبتة في هذا التدقيق.

## Realtime/Push Audit

يستخدم التطبيق Supabase Realtime لقنوات بيانات Driver والطلبات/التعيينات، ويستخدم نظام Push يربط `user_devices` وExpo Push Tokens بمعالجة notifications عبر `push-processor` وdatabase webhook. تمت مراجعة المسارات العامة، لكن اختبار الأجهزة الميداني الكامل لم يكن متاحاً ضمن التدقيق الثابت.

التحقق المتبقي يشمل duplicate subscriptions بعد دخول/خروج الشاشة، cleanup عند unmount، listener stale بعد تبديل الدور، notification routing، وعدم تسريب إشعارات التعيين أو المحادثة إلى دور آخر.

**Classification:** `PARTIALLY_IMPLEMENTED` من منظور التحقق التشغيلي.

## Media Audit

يوجد مسار ضغط للصور قبل الرفع إلى Supabase Storage، مع حد تقريبي للحجم والأبعاد، وحدود عددية للصور عبر triggers/database constraints للمتجر والمنتجات. يجب اختبار حالات image picker cancellation، الصور الكبيرة، فشل الرفع، وإعادة المحاولة على Expo SDK 54/Android.

**Classification:** `IMPLEMENTED with device-QA follow-up`.

## UX/RTL Audit

المنتج يستهدف العربية وRTL، وتوجد شاشات وعبارات عربية ومسارات سوق/أدوار متوافقة مع ذلك. تمت معالجة مشاكل سابقة في Hero carousel وChat composer وnavigation context. بقيت الحاجة إلى فحص بصري فعلي على أجهزة Android لأحجام النصوص، safe areas، لوحة المفاتيح، Android back، حالات loading/empty/error، والـmodals.

**Classification:** `PARTIALLY_IMPLEMENTED` من منظور QA البصري، مع عدم وجود سبب لتغيير التصميم على نحو واسع ضمن هذه المهمة.

## Performance Audit

تم رصد ومعالجة حلقة `Maximum update depth exceeded` السابقة في Home hero carousel، كما تمت مراجعة خطر تكرار Realtime listeners بصورة منفصلة. لا توجد إعادة هندسة واسعة مقترحة. عناصر المتابعة هي pagination للقوائم الكبيرة، image loading، عدد استدعاءات Supabase، ومراقبة الذاكرة عند تبديل الشاشات.

**Classification:** `PARTIALLY_IMPLEMENTED`؛ الإصلاحات الواضحة موجودة، لكن القياس الميداني غير مكتمل.

## Database Audit

تمت مراجعة migrations بالترتيب والـtables والـcolumns والـforeign keys والـindexes والـconstraints والـfunctions والـtriggers وRLS ذات الصلة. لم يتم تعديل schema أو تطبيق migration جديدة أثناء التدقيق.

أهم نتائج Favorites: `courier_favorites_unique_target` يفرض uniqueness على `(courier_id, target_type, target_id)`، و`target_type` يقيّد قيم store/customer. أهم نتائج Chat: تعريفات RPC المنشورة تتوافق مع migration المحلية الأخيرة وتفرض علاقة تجارية مؤهلة. أهم نتائج المالية: `account_subscriptions` وأسعار الأدوار وسياسة delivery fee متسقة مع السياسة الحالية.

**Classification:** `IMPLEMENTED with migration-history complexity`; توجد legacy columns/functions محفوظة للتوافق ولا ينبغي حذفها دون قرار.

## Build Audit

| البند | النتيجة |
|---|---|
| Node/pnpm | PASS؛ lockfile supply-chain check نجح |
| Expo SDK | `54.0.0` |
| Android package | `com.sougxpress.founder` |
| App version | `1.0.0` |
| Runtime version | `1.0.0` عبر appVersion policy |
| EAS project | `eb7659b4-30d9-4522-a73b-a507a87b4a70` |
| Profile | `preview` |
| Channel | `preview` |
| Distribution | `internal` |
| Android artifact | APK |
| Assets | icon/splash configured |
| `git diff --check` | PASS |
| Secrets in report/diff | لا توجد أسرار مطبوعة أو محفوظة في التقرير |

## Fixed Issues

| الملف/النطاق | المشكلة | السبب | الحل/الحالة | التحقق |
|---|---|---|---|---|
| `apps/mobile/src/services/favorite.service.ts` | duplicate key في Courier Favorites | إدراج target موجود مسبقاً بسبب repeated/concurrent toggle | معالجة conflict مع serialization محلي والحفاظ على toggle | schema audit + static review + `git diff --check` |
| `apps/mobile/src/app/(tabs)/home.tsx` | Maximum update depth exceeded | إعادة تشغيل state update المرتبط بالـhero scroll | الإصلاح المحلي السابق يحافظ على carousel وpagination | static review + build completed |
| `apps/mobile/src/app/store-details.tsx` / Chat path | احتمال استخدام Founder/Admin في commercial chat | الحاجة لحماية role قبل RPC | الإصلاح المحلي السابق يمنع Founder/Admin ويحافظ على RPC policy | RPC audit + build completed |
| Financial UI/constants/migrations | اختلافات قديمة في عرض الرسوم/الاشتراكات | انتقال السياسة من commission إلى subscriptions | الحالة الحالية موثقة ومتسقة في الطبقات المدققة | constants + migration + live schema read |

لم يتم تنفيذ إصلاحات واسعة أو تغييرات غير آمنة في Auth أو RLS أو RPC أو schema.

## Remaining Issues

### Critical

لا يوجد Critical issue جديد مثبت في التدقيق الحالي. تبقى المصادقة والتفويض وقواعد commercial chat مناطق حساسة ويجب عدم تغييرها دون اختبار regression.

### High

أخطاء TypeScript baseline المتعددة تمثل خطراً على قابلية الصيانة، حتى مع نجاح APK. يجب معالجتها في مهمة مستقلة، مع فصل أخطاء Founder/Merchant/Driver/Customer والتحقق من عدم إدخال regressions.

### Medium

يلزم اختبار ميداني شامل لـRealtime cleanup وPush routing وAndroid keyboard/back behavior وcheckout/order lifecycle وIDOR عبر حسابات متعددة. كما يلزم تقييم atomic toggle عبر clients مستقلين إن كان التزامن متعدد الأجهزة مطلباً.

### Low

تحذيرات EAS الحالية تتعلق بعدم تحديد `cli.version` و`cli.appVersionSource` في `eas.json`، لكنها لم تمنع البناء. لا ينبغي تغيير إعدادات البناء دون خطة توافق مستقلة.

### Needs Decision

يحتاج المشروع قراراً مستقبلياً حول توحيد تسمية Driver/Courier، وحول مصير legacy finance columns/functions، وحول ما إذا كان commercial launch سيبقى مفهوماً وصفياً أم سيُدار بحالة تشغيلية صريحة. لا ينبغي إنشاء تاريخ إطلاق أو countdown أو migration لهذا الغرض دون قرار تجاري وتقني موثق.

## APK Build

| البند | القيمة |
|---|---|
| Build ID | `8ffe9825-6e49-4af2-b147-1d2d5f654a8c` |
| Commit reported by EAS | `f709a1cc2a2bab36bc7ddbd5379cc380a59fb7ce` |
| HEAD | `f709a1cc2a2bab36bc7ddbd5379cc380a59fb7ce` |
| `origin/main` | نفس HEAD |
| Version | `1.0.0` |
| Runtime | `1.0.0` |
| Profile | `preview` |
| Channel | `preview` |
| Platform | Android |
| Status | `finished` |
| Fingerprint | `035543e38f40f4634f4a0bbc7af5b4ebfef0fde1` |
| APK artifact | [Download APK](https://expo.dev/artifacts/eas/6lmJVx_dx21Ddl6DXNm3MlQfjl1ZDYD7rNHk7W4AMDI.apk) |
| Build logs | [Open EAS build](https://expo.dev/accounts/bmatech/projects/sougxpress-founder-os/builds/8ffe9825-6e49-4af2-b147-1d2d5f654a8c) |

تحذيرات البناء غير الحاجبة: `cli.version` و`cli.appVersionSource` غير محددين في `eas.json`، وTypeScript baseline errors موثقة أعلاه. لم يتم تعديل هذه الإعدادات ضمن المهمة.

## Final Verification Checklist

| التحقق | النتيجة |
|---|---|
| System Map مقابل code/schema | PASS مع تصنيفات موثقة |
| Customer/Merchant/Driver/Founder review | PASS جزئياً مع follow-up QA موثق |
| Chat RPC and commercial relationship | PASS؛ Founder/Admin blocked |
| Favorites constraints and duplicate path | PASS للمراجعة الحالية؛ cross-client atomicity تحتاج قراراً منفصلاً |
| Financial consistency | PASS للطبقات المدققة |
| RLS/Auth/RPC unchanged | PASS |
| Database writes during audit | NONE |
| Migrations rewritten | NO |
| Secrets exposed in report | NO |
| `git diff --check` | PASS |
| APK new build | PASS |
| Commit | NOT RUN |
| Push | NOT RUN |
| OTA | NOT RUN |

## References

1. [`PROJECT_HISTORY_AND_SYSTEM_MAP.md`](./PROJECT_HISTORY_AND_SYSTEM_MAP.md) — project architecture and history reference.
2. [`apps/mobile/src/constants/earnings.ts`](./apps/mobile/src/constants/earnings.ts) — mobile financial constants and earnings split.
3. [`supabase/migrations/20260826020000_replace_delivery_commission_with_subscriptions.sql`](./supabase/migrations/20260826020000_replace_delivery_commission_with_subscriptions.sql) — subscription and delivery policy migration.
4. [`supabase/migrations/20260827010000_fix_commercial_chat_favorite_relationships.sql`](./supabase/migrations/20260827010000_fix_commercial_chat_favorite_relationships.sql) — commercial chat relationship logic.
5. [`apps/mobile/eas.json`](./apps/mobile/eas.json) — preview Android APK profile.
6. [EAS build artifact](https://expo.dev/artifacts/eas/6lmJVx_dx21Ddl6DXNm3MlQfjl1ZDYD7rNHk7W4AMDI.apk) — finished Android APK.
7. [EAS build logs](https://expo.dev/accounts/bmatech/projects/sougxpress-founder-os/builds/8ffe9825-6e49-4af2-b147-1d2d5f654a8c) — build metadata and logs.
