/**
 * useFounder — thin re-export of useAdminProfile scoped for founder screens.
 *
 * The app uses public.profiles.role as the single source of truth for
 * authorization. A "founder" is simply a user whose profiles.role = 'founder'.
 * useAdminProfile already handles both 'admin' and 'founder' roles.
 *
 * This hook is kept for forward compatibility; founder-specific screens can
 * import it instead of useAdminProfile to signal intent.
 */
export { useAdminProfile as useFounder } from "./useAdminProfile";
export type { AdminProfile as FounderProfile } from "./useAdminProfile";
