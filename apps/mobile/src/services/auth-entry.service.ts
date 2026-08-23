import { supabase } from "@/lib/supabase";

type SupportedProfileRole = "customer" | "merchant" | "driver" | "founder" | "admin";

/**
 * Resolves the existing authenticated user's normal workspace.
 * It intentionally uses Supabase's persisted session and the existing profile role;
 * it does not introduce device-local onboarding state or change role data.
 */
export async function getAuthenticatedEntryRoute(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !profile?.role) return null;

  switch (profile.role as SupportedProfileRole) {
    case "customer":
      return "/(tabs)/home";
    case "merchant":
      return "/merchant/dashboard";
    case "driver":
      return "/driver/dashboard";
    case "founder":
    case "admin":
      return "/founder";
    default:
      return null;
  }
}
