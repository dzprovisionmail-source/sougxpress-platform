# نتائج تدقيق علاقات الاتصال — staging

المشروع: Supabase staging `pmxydehrctwvawjbhrhl`.

## مخطط القلوب المؤكد

- `merchant_favorites`: `merchant_id`, `target_id`, `target_type`; النسخة الحالية من القيود المحلية تسمح `customer` و`courier` فقط.
- `courier_favorites`: `courier_id` REFERENCES `drivers(id)`, و`target_type` يسمح `store` و`customer` فقط.
- `favorite_couriers`: `user_id` و`courier_id` REFERENCES `couriers(id)`، وهو جدول أقدم مختلف عن `courier_favorites`.
- `customer_favorites`: يحتوي `customer_id`, `product_id`, `target_type`, `target_id`.

## RPC الحالي على staging

`can_start_chat(uuid, uuid, text, uuid)` يدعم فقط:

- `customer_merchant`
- `customer_courier`
- `merchant_courier`

ولا يحتوي فرعًا لـ `merchant_merchant` أو `courier_courier`.

`get_or_create_chat_conversation(uuid, text, uuid)` يعتمد على `can_start_chat` ثم ينشئ/يعيد نفس القناة حسب الطرفين ونوع العلاقة والمرجع.

`create_notification(...)` موجود ويدخل سجلات الإشعارات، لكن فحص المخطط لا يثبت وحده وجود triggers للقلب أو استدعاءً من كل واجهات حفظ القلب.

## مخطط الأدوار المؤكد

- `customers.id`, `customers.email`, `customers.full_name`, `customers.first_name`, `customers.last_name`.
- `drivers.id`, `drivers.email`, `drivers.full_name`, `drivers.first_name`, `drivers.last_name`.
- `merchants.id`, `merchants.email`, `merchants.contact_email`, `merchants.owner_full_name`, `merchants.business_name`.
- `profiles.id` هو معرّف المشاركين في `chat_conversations` حسب FK.

## الاستنتاج

1. منع التاجر من محادثة تاجر آخر سببه البنيوي غياب نوع العلاقة `merchant_merchant` من RPC وغياب نوع الهدف `merchant` من قيد `merchant_favorites`.
2. منع الموصل من محادثة موصل آخر سببه غياب `courier_courier` من RPC وغياب `courier` من قيد `courier_favorites`.
3. نجاح الشات يتطلب تحويل role-table IDs إلى `profiles.id` قبل استدعاء RPC؛ هذا يعالج خطأ `23503` لكنه لا يفتح علاقة غير مدعومة وحده.
4. إشعار وضع القلب يحتاج trigger/RPC أو استدعاءً موحدًا يضمن إنشاء notification للمستهدف وإظهارها في قائمة التفضيلات؛ وجود جدول notifications و`create_notification` لا يثبت اكتمال دورة الإشعار.
5. القواعد المطلوبة للمكالمة تختلف عن الشات: merchant↔merchant، merchant↔courier، courier↔courier مكالمة مسموحة؛ customer↔merchant شات فقط؛ customer↔courier شات وفق قلب الزبون فقط.

لم تُنفذ أي كتابة على staging في هذه الجولة حتى الآن، ولم تُلمس Production أو Git history.
