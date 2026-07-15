import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Resolves the currently authenticated Supabase user id.
 * Shared by the Merchant and Driver workspaces.
 */
export function useCurrentUserId(): { userId?: string; loading: boolean } {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUserId(data.user?.id);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}
