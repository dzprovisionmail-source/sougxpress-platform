import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export interface AdminProfile {
  id: string;
  role: string;
  full_name?: string | null;
}

type UseAdminProfileResult = {
  profile: AdminProfile | null;
  loading: boolean;
  authorized: boolean;
};

/**
 * Verifies the current session and checks public.profiles.role.
 * Only "admin" and "founder" roles are authorized.
 *
 * - No session      → redirect to /login
 * - Profile missing → redirect to /login
 * - Role not admin/founder → redirect to the appropriate workspace
 * - Role admin/founder → sets authorized = true
 */
export function useAdminProfile(): UseAdminProfileResult {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (error || !profileData) {
        router.replace("/login");
        return;
      }

      const role: string = profileData.role ?? "";

      if (!["admin", "founder"].includes(role)) {
        const roleRoutes: Record<string, string> = {
          customer: "/customer/home",
          merchant: "/merchant/dashboard",
          driver: "/driver/dashboard",
        };
        const dest = roleRoutes[role] ?? "/";
        router.replace(dest as Parameters<typeof router.replace>[0]);
        return;
      }

      setProfile(profileData as AdminProfile);
      setAuthorized(true);
      setLoading(false);
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  return { profile, loading, authorized };
}
