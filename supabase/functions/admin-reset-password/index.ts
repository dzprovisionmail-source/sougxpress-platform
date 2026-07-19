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

    // Verify the calling session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } =
      await adminClient.auth.getUser(token);
    if (callerErr || !caller) return json({ error: "جلسة غير صالحة" }, 401);

    // Verify caller role
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
    const { user_id, new_password } = body;

    if (!user_id?.trim()) return json({ error: "معرّف المستخدم مطلوب" }, 400);
    if (!new_password || String(new_password).length < 8) {
      return json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);
    }

    // Verify the target user exists and is not the caller resetting own password
    const { data: targetUser, error: targetErr } =
      await adminClient.auth.admin.getUserById(user_id);
    if (targetErr || !targetUser?.user) {
      return json({ error: "المستخدم غير موجود" }, 404);
    }

    // Perform the password reset
    const { error: updateErr } =
      await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
    if (updateErr) {
      return json({ error: `خطأ في إعادة تعيين كلمة المرور: ${updateErr.message}` }, 500);
    }

    // Audit log — best-effort
    try {
      await adminClient.rpc("log_admin_audit_event", {
        p_action: "reset_password",
        p_entity_type: "user",
        p_entity_id: user_id,
        p_details: { reset_by: caller.id, target_email: targetUser.user.email },
      });
    } catch (_) {
      // ignore
    }

    return json({ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" });
  } catch (err) {
    return json({ error: `خطأ داخلي: ${(err as Error).message}` }, 500);
  }
});
