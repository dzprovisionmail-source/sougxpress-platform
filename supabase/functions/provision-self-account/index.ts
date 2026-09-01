import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "غير مصرح" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "جلسة غير صالحة" }, 401);

    const body = await req.json();
    const role = body?.role;
    if (role !== "merchant" && role !== "driver") return json({ error: "دور غير صالح" }, 400);

    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== role) return json({ error: "الدور لا يطابق الحساب" }, 403);

    const enabled = (Deno.env.get(role === "merchant" ? "TRIAL_AUTO_APPROVE_MERCHANTS" : "TRIAL_AUTO_APPROVE_DRIVERS") ?? "true").toLowerCase() === "true";
    const status = enabled ? "active" : "pending_review";
    const zoneId = typeof body.zone_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.zone_id) ? body.zone_id : null;

    if (role === "merchant") {
      const { error } = await admin.from("merchants").upsert({
        id: user.id,
        owner_full_name: body.full_name || "تاجر",
        business_name: body.business_name || body.full_name || "متجر",
        phone: body.phone || "",
        contact_phone: body.phone || "",
        contact_email: user.email || body.email || "",
        email: user.email || body.email || "",
        zone_id: zoneId,
        address: body.address || null,
        status,
      }, { onConflict: "id" });
      if (error) return json({ error: error.message }, 400);
    } else {
      const { error } = await admin.from("drivers").upsert({
        id: user.id,
        first_name: body.first_name || "موصل",
        last_name: body.last_name || "جديد",
        full_name: body.full_name || "موصل جديد",
        phone_number: body.phone || "",
        phone: body.phone || "",
        email: user.email || body.email || "",
        vehicle_type: body.vehicle_type,
        city: body.city || "Ain Sefra",
        neighborhood: body.neighborhood,
        zone_id: zoneId,
        availability: "offline",
        is_available: false,
        status,
      }, { onConflict: "id" });
      if (error) return json({ error: error.message }, 400);
    }

    return json({ success: true, status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "خطأ غير متوقع" }, 500);
  }
});
