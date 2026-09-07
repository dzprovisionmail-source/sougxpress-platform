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
    const email = String(user.email ?? body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const fullName = String(body.full_name ?? "").trim();
    if (!email) return json({ error: "البريد الإلكتروني مطلوب." }, 400);
    if (!phone) return json({ error: "رقم الهاتف مطلوب." }, 400);
    if (!fullName) return json({ error: "الاسم الكامل مطلوب." }, 400);

    if (role === "merchant") {
      const businessName = String(body.business_name ?? fullName).trim();
      if (!businessName) return json({ error: "اسم المتجر مطلوب." }, 400);
      const { data: conflictingMerchant } = await admin
        .from("merchants")
        .select("id")
        .or(`contact_email.eq.${email},contact_phone.eq.${phone}`)
        .neq("id", user.id)
        .limit(1)
        .maybeSingle();
      if (conflictingMerchant) return json({ error: "البريد الإلكتروني أو رقم الهاتف مستخدم مسبقًا." }, 409);
      const { error } = await admin.from("merchants").upsert({
        id: user.id,
        owner_full_name: fullName,
        business_name: businessName,
        phone,
        contact_phone: phone,
        contact_email: email,
        email,
        zone_id: zoneId,
        address: body.address || null,
        status,
      }, { onConflict: "id" });
      if (error) return json({ error: "تعذر حفظ بيانات التاجر: " + error.message }, 400);
    } else {
      const { data: conflictingDriver } = await admin
        .from("drivers")
        .select("id")
        .or(`email.eq.${email},phone_number.eq.${phone}`)
        .neq("id", user.id)
        .limit(1)
        .maybeSingle();
      if (conflictingDriver) return json({ error: "البريد الإلكتروني أو رقم الهاتف مستخدم مسبقًا." }, 409);
      const { error } = await admin.from("drivers").upsert({
        id: user.id,
        first_name: String(body.first_name ?? fullName.split(" ")[0] ?? "موصل"),
        last_name: String(body.last_name ?? (fullName.split(" ").slice(1).join(" ") || "جديد")),
        full_name: fullName,
        phone_number: phone,
        phone,
        email,
        vehicle_type: body.vehicle_type,
        city: body.city || "Ain Sefra",
        neighborhood: body.neighborhood,
        zone_id: zoneId,
        availability: "offline",
        is_available: false,
        status,
      }, { onConflict: "id" });
      if (error) return json({ error: "تعذر حفظ بيانات الموصل: " + error.message }, 400);
    }

    return json({ success: true, status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "خطأ غير متوقع" }, 500);
  }
});
