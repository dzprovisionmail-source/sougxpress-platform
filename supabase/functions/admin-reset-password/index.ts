// admin-reset-password
// Resets a user's password using only built-in Deno APIs (no external imports).
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY env vars
// (all injected automatically by Supabase Edge Runtime).

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرح" }, 401);
    const callerToken = authHeader.replace("Bearer ", "");

    // ── 1. Verify the calling session ────────────────────────────────────────
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${callerToken}`,
        apikey: ANON_KEY,
      },
    });
    if (!userRes.ok) return json({ error: "جلسة غير صالحة" }, 401);
    const { id: callerId } = await userRes.json() as { id: string };
    if (!callerId) return json({ error: "جلسة غير صالحة" }, 401);

    // ── 2. Verify caller role from profiles ──────────────────────────────────
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=role&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );
    const profiles = await profileRes.json() as Array<{ role: string }>;
    const callerRole = profiles?.[0]?.role ?? "";
    if (!["admin", "founder"].includes(callerRole)) {
      return json({ error: "يتطلب دور مشرف أو مؤسس" }, 403);
    }

    // ── 3. Parse and validate request body ───────────────────────────────────
    const body = await req.json() as { user_id?: string; new_password?: string };
    const { user_id, new_password } = body;

    if (!user_id?.trim())                      return json({ error: "معرّف المستخدم مطلوب" }, 400);
    if (!new_password || new_password.length < 8) return json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);

    // ── 4. Verify target user exists ─────────────────────────────────────────
    const targetRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user_id}`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    if (!targetRes.ok) return json({ error: "المستخدم غير موجود" }, 404);
    const targetUser = await targetRes.json() as { email?: string };

    // ── 5. Update password via Auth Admin API ─────────────────────────────────
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: new_password }),
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.json() as { message?: string };
      return json({ error: `خطأ في إعادة تعيين كلمة المرور: ${err.message ?? "unknown"}` }, 500);
    }

    // ── 6. Audit log via RPC (best-effort, uses caller's token) ──────────────
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_admin_audit_event`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${callerToken}`,
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_action:      "reset_password",
          p_entity_type: "user",
          p_entity_id:   user_id,
          p_details:     JSON.stringify({ reset_by: callerId, target_email: targetUser.email }),
        }),
      });
    } catch (_) { /* best-effort */ }

    return json({ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" });
  } catch (err) {
    return json({ error: `خطأ داخلي: ${(err as Error).message}` }, 500);
  }
});
