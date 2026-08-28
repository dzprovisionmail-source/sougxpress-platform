# Live finance schema findings

- Supabase target: `pmxydehrctwvawjbhrhl` (Soug-XPRESS-Staging), ACTIVE_HEALTHY.
- Live `public.orders` includes `order_total_minor`, `delivery_fee_minor`, `platform_commission_minor`, plus `subtotal_minor` and `total_minor` in the current live shape. It has RLS enabled.
- Live `public.drivers` includes legacy operational fields: `delivery_count`, `commission_owed_minor`, `commission_paid_through_count`, `is_suspended_for_debt`; also `delivered_count` and profile fields. It has RLS enabled.
- Live `public.delivery_commission_cycles` exists with `driver_id`, cycle dates, `deliveries_count`, `commission_earned_minor`, `status`, payment timestamps.
- Current historical migration `20260814110000_align_driver_commission_runtime.sql` creates the driver completion trigger that adds 4000 minor commission per delivered assignment and suspends at 50 unpaid deliveries. `20260814140000_block_suspended_driver_assignments.sql` adds DB enforcement on assignment updates.
- No subscription table/columns were found in the local migration/app search.
- Current app sources: `useCart.ts` uses 20000 minor delivery fee; `useCheckout.ts` injects `Math.round(subtotal * 0.1)`; `checkout.service.ts` has the same 10% fallback and persists platform commission; `driver-orders.service.ts` blocks at suspended/50 unpaid; `constants/earnings.ts` uses 20000 fee with 80/20 split.
- User-approved policy: delivery fee 15000 minor, fully driver-owned, platform commission 0; driver subscription 500 DZD/month with first month free; merchant subscription 1000 DZD/month with first month free; no per-order commission, no 50-delivery lock, no commission debt; retain historical migrations but add a new migration; no OTA/APK in this financial task.
