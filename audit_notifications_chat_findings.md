# Soug-XPRESS Audit Findings — 2026-08-26

## نطاق التدقيق
Audit only؛ لا تعديلات على source أو migrations أو Supabase أو RLS أو EAS.

## Product Grids
- `apps/mobile/src/app/(tabs)/home.tsx`: يجلب `products` من `public.products` بحالة `active`، ترتيب `created_at desc`، حد 10؛ قسم «منتجات شائعة» يظهر للضيف فقط عبر `ScrollView` أفقي، بطاقة `ProductCard` بعرض تصميمي 160، مع مسار `/product-details`.
- Home أيضًا يعتمد على `useStores`, `useSearch`, categories وSupabase؛ المفضلة تُقرأ من `favorite.service` عند وجود مستخدم.
- `apps/mobile/src/app/guest-marketplace.tsx`: لا يملك Grid مستقلًا؛ هو `Redirect` إلى `/(tabs)/home` مع تمرير `preview` و`identity`.
- `apps/mobile/src/app/store-details.tsx`: المنتجات تُعرض في Grid يدوي `flexDirection: row`, `flexWrap: wrap`, كل wrapper `width: '50%'`; البيانات `filteredProducts` وتُعرض بواسطة `ProductCard`. المسار إلى `/product-details`.
- `apps/mobile/src/components/ui/ProductCard.tsx` هو المكوّن المشترك؛ توجد أيضًا façade في `components/product/ProductCard.tsx`.
- لا يوجد في المسارات المفحوصة FlatList product grid مستقل أو `numColumns` للمسار Customer؛ Grid متجر التفاصيل هو 2-column بالـ50%، بينما Home featured products أفقي بعرض ثابت.

## Chat source/UI
- `apps/mobile/src/services/chat.service.ts`: أنواع العلاقات `customer_merchant`, `customer_courier`, `merchant_courier`; أنواع المحادثة `commercial`, `support`.
- المحادثات تُقرأ من view `v_chat_conversations_list`، تُحدد المحادثات عبر `participant_one/participant_two`, وتُحوّل هوية الطرف الآخر من أعمدة view (`p1/p2_full_name`, avatar, role, store name/logo). ترتيب القائمة `last_message_at desc`.
- `apps/mobile/src/app/chat/index.tsx`: يعرض الطرف الآخر باسم المتجر للتاجر، وإلا `full_name` أو «مستخدم»، مع avatar؛ العنصر كله يفتح `/chat/[id]`. يعرض آخر رسالة/placeholder، نوع العلاقة، وreference order badge. لا توجد pagination ولا unread badge فعلي مستخدم من `unread_count`.
- `apps/mobile/src/app/chat/[id].tsx`: يقرأ user profile role، conversation، order context وmessages؛ الرسائل تُقرأ من `chat_messages` بترتيب `created_at asc`، ثم `markAsRead`. يوجد Realtime INSERT listener عبر `subscribeToMessages` على `chat_messages` مع duplicate-channel protection. الإرسال optimistic ثم Supabase insert، مع retry state محلي عند الفشل. لا توجد pagination للرسائل.
- Chat detail header يستخدم `conversation.other_participant` للاسم/avatar/role/availability؛ الرسائل تُعرض كفقاعات حسب `sender_id`. لا توجد profile card أو modal قابلة للفتح من avatar/message ضمن مسارات Chat المفحوصة؛ avatar في قائمة المحادثات ليس رابط profile.
- support conversation يُفتح عبر `getOrCreateSupportConversation()` RPC؛ القائمة تمرر `support=1`، والواجهة تعرض «دعم Soug-XPRESS» وتمنع commercial actions في support.
- الهوية الرسمية `soug-admin` تُحل داخل RPC عبر `platform_public_profiles.slug = 'soug-admin'` مع profile role founder/admin، مع fail-closed عند الغياب/الالتباس.
- `getOrCreateConversation` التجاري يعتمد على `get_or_create_chat_conversation` RPC و`can_start_chat`، الذي يتحقق من order/favorite/delivery relationships.

## Live Supabase project
- Project ref audited: `pmxydehrctwvawjbhrhl` (Soug-XPRESS-Staging), ACTIVE_HEALTHY.
- Live RLS policies exist for `chat_conversations`, `chat_messages`, `notifications`, `user_devices`.
- Chat conversations: own participant SELECT; commercial INSERT requires participant and `can_start_chat`; support INSERT direct denied; support SELECT for participants or `is_support_staff`; support UPDATE timestamps for participants/staff.
- Chat messages: own conversation SELECT/INSERT via EXISTS on `chat_conversations`; support policies restrict to support conversations/participants/staff; sender must equal auth.uid().
- Notifications: own-user SELECT/UPDATE; founder/admin via `get_user_role`; INSERT restricted to admin/founder. No DELETE policy observed in live `pg_policies` result.
- user_devices: own-device SELECT/INSERT/UPDATE/DELETE, founder/admin exception; role lookup in these policies reads `auth.users.raw_app_meta_data` directly.
- Live functions `can_start_chat`, `create_notification`, `get_or_create_chat_conversation`, `get_or_create_support_conversation`, `get_user_role`, `is_support_staff` are SECURITY DEFINER. `get_user_role` reads `public.profiles`; `is_support_staff` reads `public.profiles` with founder/admin role. Support RPC reads current user profile and `platform_public_profiles`/profiles to resolve `soug-admin`.
- No rows were returned by the checked `pg_publication_tables` query for the four tables; this means database publication membership was not confirmed by that query. App code still registers Supabase Realtime channels for `chat_messages` and `notifications`, so runtime Realtime behavior needs device/live verification.

## Notifications
- `apps/mobile/src/app/customer/notifications.tsx`: queries `notifications` by `user_id`, orders newest first, supports all/unread filter, marks one/all read, deletes via `.delete()`, and subscribes to `postgres_changes` event `*` filtered by `user_id`; no explicit push registration.
- Search found no `expo-notifications`, Firebase messaging, Notifee, `requestPermissionsAsync`, `getExpoPushTokenAsync`, `getDevicePushTokenAsync`, or push token registration in mobile dependencies/source/config. No `src/services/notifications.service.ts`; only role notification screens and merchant notification hook/service.
- Supabase migration `202607110002200_notification_foundation.sql` defines `user_devices` push-token table, notification schema extensions, SECURITY DEFINER `create_notification`, order/delivery/transaction triggers, and RLS. Backend notification rows are therefore wired, but client push delivery is not wired in the audited mobile code.
- The migration’s initial policies use direct `auth.users.raw_app_meta_data`; later `202607110002600_fix_customer_routes_rls.sql` replaces notification policies with `get_user_role`, but live `user_devices` policies still show direct `auth.users` role lookup.
- `app.json`/mobile package search did not show a notification plugin/dependency, so Android notification permission/channel/native configuration was not confirmed and appears absent.

## Initial impact hypotheses
- Current product grid behavior is split: Home horizontal featured products vs store-details 2-column grid; no independent Customer category/search grid was found in the inspected routes.
- Chat history is currently unpaginated and view-driven; large histories may affect load time/memory. Realtime is implemented for messages/notifications in app code, but publication membership was not confirmed from the live query.
- Private profile card feature is absent from Chat UI; implementing it would require an explicit route/modal and secure profile-data contract, not merely UI wiring.
- Notifications currently support in-app database notifications and Realtime refresh, read/unread state, and delete action. Push notifications are not end-to-end wired in the mobile client; adding them would be a native/dependency/config change and should be planned separately from this audit.
- No code, migration, DB object, EAS config, or Git state was modified during this audit.
