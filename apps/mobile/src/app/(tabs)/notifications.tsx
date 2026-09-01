import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "customer" | "merchant" | "driver" | "founder" | "admin";

export default function NotificationsTab() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        if (mounted) setRole("customer");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (mounted) setRole((profile?.role as Role) || "customer");
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!role) return null;
  if (role === "merchant") return <Redirect href="/merchant/notifications" />;
  if (role === "driver") return <Redirect href="/driver/notifications" />;
  if (role === "founder" || role === "admin") return <Redirect href="/admin/notifications" />;
  return <Redirect href="/customer/notifications" />;
}
