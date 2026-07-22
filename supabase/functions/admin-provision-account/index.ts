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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } =
      await adminClient.auth.getUser(token);
    if (callerErr || !caller) return json({ error: "جلسة غير صالحة" }, 401);

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

    if (!["merchant", "driver", "customer"].includes(role)) {
      return json({ error: "دور غير صالح" }, 400);
    }

    if (!full_name?.trim()) return json({ error: "الاسم الكامل مطلوب" }, 400);
    if (!phone?.trim()) return json({ error: "رقم الهاتف مطلوب" }, 400);

    const normalPhone = phone.trim();
    const hasEmail = Boolean(email?.trim());
    const hasPassword = Boolean(password && String(password).length >= 6);

    if (hasEmail && !hasPassword) {
      return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل عند توفير البريد الإلكتروني" }, 400);
    }

    let normalEmail = "";
    let userId = crypto.randomUUID();

    if (hasEmail) {
      normalEmail = email.trim().toLowerCase();
    } else {
      normalEmail = `seed-${userId}@local`;
    }

    // Reject duplicate phone in the role table using the correct column name
    const roleTable =
      role === "merchant" ? "merchants" : role === "driver" ? "drivers" : "customers";
    const phoneColumn =
      role === "merchant" ? "contact_phone" : "phone_number";
    const { data: dupPhone } = await adminClient
      .from(roleTable)
      .select("id")
      .eq(phoneColumn, normalPhone)
      .maybeSingle();
    if (dupPhone) return json({ error: "رقم الهاتف مستخدم مسبقاً" }, 409);

    // Create Auth user
    const authPayload: Record<string, unknown> = {
      email: normalEmail,
      email_confirm: true,
    };
    if (hasPassword) authPayload.password = password as string;

    const { data: authData, error: authErr } =
      await adminClient.auth.admin.createUser(authPayload);
    if (authErr || !authData?.user) {
      return json(
        { error: `خطأ في إنشاء حساب المصادقة: ${authErr?.message}` },
        500
      );
    }
    userId = authData.user.id;

    // Insert profile (base columns only)
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: userId,
      role,
    });
    if (profileErr) {
      await adminClient.auth.admin.deleteUser(userId);
      return json(
        { error: `خطأ في إنشاء الملف الشخصي: ${profileErr.message}` },
        500
      );
    }

    const nameParts = full_name.trim().split(" ");

    // Insert role-specific record (base columns only)
    let insertErr: unknown = null;
    if (role === "merchant") {
      const { error } = await adminClient.from("merchants").insert({
        id: userId,
        business_name: business_name?.trim() || full_name.trim(),
        contact_email: normalEmail,
        contact_phone: normalPhone,
        description: null,
        logo_url: null,
        is_active: true,
      });
      insertErr = error;
    } else if (role === "driver") {
      const { error } = await adminClient.from("drivers").insert({
        id: userId,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        phone_number: normalPhone,
        email: normalEmail,
        vehicle_type: vehicle_type?.trim() || null,
        license_plate: vehicle_number?.trim() || null,
        is_available: false,
        rating: 0,
        review_count: 0,
      });
      insertErr = error;
    } else {
      const { error } = await adminClient.from("customers").insert({
        id: userId,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        phone_number: normalPhone,
        email: normalEmail,
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

    // Audit log — best-effort
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
