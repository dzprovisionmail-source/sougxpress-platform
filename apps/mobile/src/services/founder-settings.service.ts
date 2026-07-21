import { supabase } from "@/lib/supabase";

export interface FounderPlatformSetting {
  key: string;
  value: unknown;
  zone_id: string | null;
  effective_from: string;
  set_by: string;
  created_at: string;
}

export async function getFounderSettings(): Promise<FounderPlatformSetting[]> {
  const { data, error } = await supabase
    .from("platform_financial_settings")
    .select("*")
    .order("key");

  if (error) console.error("getFounderSettings:", error.message);
  return (data ?? []) as FounderPlatformSetting[];
}

export async function updateFounderSetting(
  key: string,
  value: unknown,
  zoneId?: string | null
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {
    key,
    value,
    effective_from: new Date().toISOString(),
    set_by: "",
    zone_id: zoneId ?? null,
  };

  const { error } = await supabase
    .from("platform_financial_settings")
    .upsert(payload, { onConflict: "key,zone_id" });

  return { error: error?.message ?? null };
}

export async function getFounderAdminProfiles(): Promise<
  Array<{ id: string; email: string; role: string; created_at: string }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .in("role", ["admin", "founder"])
    .order("created_at", { ascending: false });

  if (error) console.error("getFounderAdminProfiles:", error.message);
  return (data ?? []) as Array<{ id: string; email: string; role: string; created_at: string }>;
}
