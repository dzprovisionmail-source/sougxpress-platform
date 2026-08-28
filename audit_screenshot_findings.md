# Screenshot findings

- Screenshot_20260828_002112_ExpoGo.jpg: شاشة تفاصيل متجر؛ الضغط على «دردشة مع المتجر» يعرض رسالة عربية تفيد بعدم وجود علاقة تجارية مؤهلة لبدء المحادثة، مع ظهور Toast إنجليزي مبتور يبدأ بـ `Chat error: Error: Chat participant pr...`.
- Screenshot_20260828_002058_ExpoGo.jpg: شاشة قائمة «الزبائن المتصلون»/المفضلة؛ بطاقات متعددة تعرض الاسم العام «مستخدم جديد» بدل الاسم الحقيقي. الضغط على «تفاصيل» يعرض رسالة عدم وجود طلب نشط، ما يدل على اقتران زر التفاصيل بمسار الطلب لا ببيانات الملف الشخصي.
- الدليل الأول يرجح خللاً في eligibility أو participant mapping لا في تنسيق RTL فقط. الدليل الثاني يرجح أن RPC أو join يعيد fallback اسمه العام، ويجب تتبعه إلى المصدر.

تؤكد اللقطتان البرمجيتان أن الخطأ الفعلي هو `Chat participant profile not found`، ويظهر في `chat.service.ts` داخل `getOrCreateConversation` ثم ينتقل إلى `favorites.tsx` داخل `handleStartChat`. هذا يؤكد أن الحارس الحالي يرفض participant id لا يقابله سجل في `profiles`، وأن المشكلة قد تكون ما زالت في caller آخر أو في payload/RPC يعيد driver id/store id بدل profile id.
