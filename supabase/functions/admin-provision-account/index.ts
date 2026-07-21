// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرح" }, 401);

    // Admin client — service_role lives only on the server, never in the mobile bundle
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the calling session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } =
      await adminClient.auth.getUser(token);
    if (callerErr || !caller) return json({ error: "جلسة غير صالحة" }, 401);

    // Verify caller role from public.profiles
    const { data: callerProfile, error: roleErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (
      roleErr ||
      !callerProfile ||
      !["admin", "founder"].includes(callerProfile.role)
    ) {
      return json({ error: "يتطلب دور مشرف أو مؤسس" }, 403);
    }

    const body = await req.json();
    const {
      role,
      full_name,
      phone,
      email,
      password,
      zone_id,
      address,
      status,
      vehicle_type,
      vehicle_number,
      is_gold_member,
      business_name,
    } = body;

    // Validate role
    if (!["merchant", "driver", "customer"].includes(role)) {
      return json({ error: "دور غير صالح" }, 400);
    }

    // Validate required fields
    if (!full_name?.trim()) return json({ error: "الاسم الكامل مطلوب" }, 400);
    if (!phone?.trim()) return json({ error: "رقم الهاتف مطلوب" }, 400);
    if (!email?.trim()) return json({ error: "البريد الإلكتروني مطلوب" }, 400);
    if (!password || String(password).length < 6)
      return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);

    const normalEmail = email.trim().toLowerCase();
    const normalPhone = phone.trim();

    // Reject duplicate email
    const { data: dupEmail } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalEmail)
      .maybeSingle();
    if (dupEmail) return json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, 409);

    // Reject duplicate phone in the role table
    const roleTable =
      role === "merchant" ? "merchants" : role === "driver" ? "drivers" : "customers";
    const { data: dupPhone } = await adminClient
      .from(roleTable)
      .select("id")
      .eq("phone", normalPhone)
      .maybeSingle();
    if (dupPhone) return json({ error: "رقم الهاتف مستخدم مسبقاً" }, 409);

    // Create Auth user — server-side only
    const { data: authData, error: authErr } =
      await adminClient.auth.admin.createUser({
        email: normalEmail,
        password,
        email_confirm: true,
      });
    if (authErr || !authData?.user) {
      return json(
        { error: `خطأ في إنشاء حساب المصادقة: ${authErr?.message}` },
        500
      );
    }
    const userId = authData.user.id;

    // Upsert profile
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: userId,
      full_name: full_name.trim(),
      email: normalEmail,
      phone: normalPhone,
      role,
    });
    if (profileErr) {
      await adminClient.auth.admin.deleteUser(userId);
      return json(
        { error: `خطأ في إنشاء الملف الشخصي: ${profileErr.message}` },
        500
      );
    }

    // Insert role-specific record
    let insertErr: unknown = null;
    if (role === "merchant") {
      const { error } = await adminClient.from("merchants").insert({
        id: userId,
        owner_full_name: full_name.trim(),
        business_name: business_name?.trim() || full_name.trim(),
        contact_email: normalEmail,
        contact_phone: normalPhone,
        phone: normalPhone,
        email: normalEmail,
        zone_id: zone_id || null,
        address: address?.trim() || null,
        description: null,
        logo_url: null,
        commission_rate: 0,
        is_active: true,
        status: status || "pending_review",
      });
      insertErr = error;
    } else if (role === "driver") {
      const nameParts = full_name.trim().split(" ");
      const { error } = await adminClient.from("drivers").insert({
        id: userId,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        full_name: full_name.trim(),
        phone_number: normalPhone,
        phone: normalPhone,
        email: normalEmail,
        zone_id: zone_id || null,
        address: address?.trim() || null,
        vehicle_type: vehicle_type?.trim() || null,
        vehicle_number: vehicle_number?.trim() || null,
        status: status || "offline",
        is_available: false,
        delivered_count: 0,
      });
      insertErr = error;
    } else {
      const { error } = await adminClient.from("customers").insert({
        id: userId,
        full_name: full_name.trim(),
        phone: normalPhone,
        email: normalEmail,
        zone_id: zone_id || null,
        address: address?.trim() || null,
        status: status || "active",
        is_gold_member: is_gold_member === true,
      });
      insertErr = error;
    }

    if (insertErr) {
      await adminClient.auth.admin.deleteUser(userId);
      return json(
        { error: `خطأ في إنشاء السجل: ${(insertErr as Error).message}` },
        500
      );
    }

    // Audit log — best-effort, never blocks the response
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: caller.id,
        action: "admin_provision_account",
        target_type: role,
        target_id: userId,
        details: JSON.stringify({
          role,
          email: normalEmail,
          phone: normalPhone,
          full_name: full_name.trim(),
        }),
      });
    } catch (_) {
      // ignore
    }

    const roleLabel =
      role === "merchant" ? "التاجر" : role === "driver" ? "الموصل" : "الزبون";

    // Return safe payload — no secrets, no service_role key
    return json({
      success: true,
      user_id: userId,
      role,
      email: normalEmail,
      phone: normalPhone,
      full_name: full_name.trim(),
      message: `تم إنشاء حساب ${roleLabel} بنجاح`,
    });
  } catch (err) {
    return json({ error: `خطأ داخلي: ${(err as Error).message}` }, 500);
  }
});
