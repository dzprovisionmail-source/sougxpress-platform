# تقرير هندسة صلاحيات الشات التجاري (Commercial Chat Permission Architecture)
**منصة Soug-XPRESS — المرحلة الأولى (Chat Phase 1)**

إعداد: **Manus AI**  
المستند المرجعي المعتمد: `SOUG_XPRESS_FAVORITES_COMMERCIAL_CYCLE_SKILL.md`

---

## 1. مقدمة ونطاق التقرير
تنفيذًا لتوجيهات المرحلة الأولى من نظام المحادثات (`Chat Phase 1`)، يركز هذا التقرير حصراً على **التحليل البنيوي وتصميم مصفوفة صلاحيات الشات التجاري** فوق العلاقات التجارية والمفضلات والطلبات الموجودة فعلياً في منصة Soug-XPRESS.  

يُحظر تماماً في هذه المرحلة أي تعديل على كود الواجهات، أو نظام المفضلة، أو التنقل السفلي (Bottom Navigation)، أو النموذج المالي (رسوم التوصيل الثابتة 200 DZD). الهدف الرئيسي هو هندسة هيكل إذن آمن يعتمد على مبدأ **"عدم السماح بأي محادثة عشوائية" (Zero Random Chat)** وضمان ارتباط كل قناة دردشة حصراً بعلاقة تجارية موثقة.

---

## 2. تدقيق العلاقات التجارية القائمة (Existing Commercial Relations Audit)

أظهر فحص جداول قاعدة البيانات وسياسات الأمان (RLS) وجود فصل دقيق وواضح بين الجداول التالية، والتي تشكل أساس صلاحيات الشات:

| جدول العلاقة | الطرفان المرتبطان | حد التوثيق / القواعد الحالية | دورها في الشات |
| :--- | :--- | :--- | :--- |
| **`customer_favorites`** | الزبون $\leftrightarrow$ المتجر / المنتج | الزبون يضيف المتجر (`target_type = 'store'`). | يثبت اهتمام الزبون بالمتجر (مصدر Phase 2 للتاجر). |
| **`merchant_favorites`** | التاجر $\leftrightarrow$ الزبون / الموصل | التاجر يضيف الزبون يدويًا (`target_type = 'customer'`) أو الموصل (`target_type = 'courier'`). | يثبت قائمة عملاء وموصلين التاجر المفضلين (Phase 3). |
| **`favorite_couriers`** | الزبون $\leftrightarrow$ الموصل | الزبون يفضل موصلاً معيناً (`user_id` $\rightarrow$ `courier_id`). | **الحد الأقصى المعتمد: 10 موصلين** لكل زبون. يثبت تفضيل الزبون للموصل. |
| **`courier_favorites`** | الموصل $\leftrightarrow$ المتجر / الزبون | الموصل يفضل متاجر أو زبائن تعامل معهم. | تخص مفضلات الموصل الشخصية ولا تختلط بـ `favorite_couriers`. |
| **`orders` & `delivery_assignments`** | الزبون $\leftrightarrow$ التاجر $\leftrightarrow$ الموصل | الطلبات وعلاقات التوصيل النشطة والسابقة. | العلاقة التشغيلية المباشرة لتوصيل الطلبات. |

---

## 3. مصفوفة شروط فتح الشات التجاري (Commercial Chat Eligibility Matrix)

لكي يصبح أي طرفين مؤهلين لفتح قناة دردشة (Chat Channel)، يجب أن تتحقق إحدى الشروط التجارية التالية بدقة، مع حظر أي تواصل خارج هذا النطاق:

### أ. محادثة الزبون مع التاجر (Customer $\leftrightarrow$ Merchant)
*   **متى تكون مؤهلة؟**
    1. وجود سجل تفضيل في `customer_favorites` حيث (`target_type = 'store'` و `target_id` يتبع لمتجر التاجر المعني)، **أو**
    2. وجود سجل تفضيل في `merchant_favorites` حيث (`target_type = 'customer'` و `target_id` هو الزبون المعني)، **أو**
    3. وجود طلب سابق أو حالي (`orders`) يربط بين الزبون والمتجر.
*   **قواعد الأمان والخصوصية:** يُمنع تماماً كشف أو تبادل أرقام الهواتف. الاعتماد يتم حصراً على معرّفات النظام (`auth.uid()`) والاسم والحي.

### ب. محادثة الزبون مع الموصل (Customer $\leftrightarrow$ Courier)
*   **متى تكون مؤهلة؟**
    1. وجود سجل في جدول `favorite_couriers` يربط الزبون بالموصل (بما لا يتجاوز حد الـ **10 موصلين** المعتمد)، **أو**
    2. وجود تعيين توصيل (`delivery_assignments`) يربط بين طلب الزبون والموصل.
*   **قواعد الأمان والخصوصية:** التزام صارم بإخفاء رقم هاتف الزبون عن الموصل؛ التواصل مقتصر على التنسيق التجاري للطلب أو المفضلة الموثقة.

### ج. محادثة التاجر مع الموصل (Merchant $\leftrightarrow$ Courier)
*   **متى تكون مؤهلة؟**
    1. وجود سجل في جدول `merchant_favorites` حيث (`target_type = 'courier'` و `target_id` هو الموصل)، **أو**
    2. وجود طلب توصيل مشترك بين متجر التاجر والموصل عبر `delivery_assignments` و `orders`.

---

## 4. الفجوات الحالية وهيكل جداول الشات المقترح (Proposed Chat Data Structures)

نظراً لأن النظام ركّز في المراحل السابقة على المفضلة والطلبات، فإن جداول الرسائل وجلسات المحادثة **غير موجودة بعد**. لتكون مبنية بشكل آمن ومتوافق مع RLS، نقترح الهيكل التالي (للتوثيق الهندسي فقط دون تعديل الكود الحالي):

### 1. جدول جلسات المحادثة (`chat_conversations`)
```sql
CREATE TABLE public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id),
    participant_two UUID NOT NULL REFERENCES public.profiles(id),
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('customer_merchant', 'customer_courier', 'merchant_courier')),
    reference_id UUID, -- order_id or entity reference if applicable
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. جدول الرسائل (`chat_messages`)
```sql
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. سياسات الأمان والحماية (Required RLS Policies for Chat)

لحماية المحادثات ومنع أي اختراق أو محادثة عشوائية، ستخضع الجداول لسياسات RLS التالية:
1.  **قراءة الجلسات (`SELECT`)**: يُسمح للمستخدم برؤية الجلسة حصراً إذا كان هو أحد المشاركين فيها (`participant_one = auth.uid() OR participant_two = auth.uid()`).
2.  **إرسال الرسائل (`INSERT`)**: يُسمح فقط للمستخدم المُصادق (`auth.uid()`) والذي يمثل `sender_id` بإدراج رسالة في جلسة هو طرف فيها.
3.  **التحقق من الأهلية التجاريّة**: يتم تنفيذ دالة تحقق (Validation Function/RPC) تمنع إنشاء أي جلسة في `chat_conversations` مالم توجد علاقة تجارية صالحة في جداول (`customer_favorites`, `merchant_favorites`, `favorite_couriers`, أو `orders`).

---

## 6. مخطط دورة الشات الكاملة (Full Chat Lifecycle Pipeline)

1.  **المرحلة الأولى (تأسيس العلاقة التجارية)**: تفاعل موثق عبر المفضلة (`customer_favorites`, `merchant_favorites`, `favorite_couriers` بحد أقصى 10 موصلين) أو دورة الطلبات.
2.  **المرحلة الثانية (طلب فتح المحادثة)**: يتحقق النظام برمجيًا عبر قواعد الأمان من صلاحية الطرفين وعدم وجود أي عشوائية.
3.  **المرحلة الثالثة (إنشاء الجلسة الآمنة)**: فتح سجل في `chat_conversations` مع ربطه بنوع العلاقة.
4.  **المرحلة الرابعة (التبادل الآمن للرسائل)**: إرسال الرسائل عبر `chat_messages` مع حظر كامل لكشف أرقام الهواتف أو استخدامها كهوية.

---
**حالة التقرير**: مكتمل ونهائي للمرحلة الأولى، وخاضع لتقييمكم بانتظار الموافقة قبل الانتقال لأي خطوات برمجية لاحقة.
