import CustomerNotificationsScreen from "@/app/customer/notifications";
import MerchantNotificationsScreen from "@/app/merchant/notifications";
import DriverNotificationsScreen from "@/app/driver/notifications";
import AdminNotificationsScreen from "@/app/admin/notifications";
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
  if (role === "merchant") return <MerchantNotificationsScreen />;
  if (role === "driver") return <DriverNotificationsScreen />;
  if (role === "founder" || role === "admin") return <AdminNotificationsScreen />;
  return <CustomerNotificationsScreen />;
}
