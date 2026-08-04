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

function ok(body: Record<string, unknown>) {
  return json(body, 200);
}

function fail(error: string) {
  return json({ success: false, error }, 200);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("غير مصرح");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } =
      await adminClient.auth.getUser(token);
    if (callerErr || !caller) return fail("جلسة غير صالحة");

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
      return fail("يتطلب دور مشرف أو مؤسس");
    }

    const body = await req.json();
    const { action, payload } = body;

    if (!action || typeof action !== "string") {
      return fail("الإجراء مطلوب");
    }

    // ─── LIST ────────────────────────────────────────────────────────────────

    if (action === "list") {
      const {
        search,
        status_filter = "all",
        include_inactive = false,
        limit = 100,
      } = payload ?? {};

      let query = adminClient
        .from("couriers")
        .select("*")
        .order("display_order", { ascending: true })
        .order("is_pinned", { ascending: false })
        .order("rating", { ascending: false })
        .limit(Math.min(Number(limit) || 100, 200));

      if (search?.trim()) {
        query = query.or(
          `full_name.ilike.%${search.trim()}%,phone_number.ilike.%${search.trim()}%`
        );
      }

      if (status_filter === "available") {
        query = query.eq("is_available", true);
      } else if (status_filter === "unavailable") {
        query = query.eq("is_available", false);
      } else if (status_filter === "demo") {
        query = query.eq("is_mock", true);
      } else if (status_filter === "verified") {
        query = query.eq("is_verified", true);
      } else if (status_filter === "pinned") {
        query = query.eq("is_pinned", true);
      } else if (status_filter === "hidden") {
        query = query.or("is_available.eq.false,show_on_home.eq.false");
      }

      if (!include_inactive) {
        query = query.or("is_available.eq.true,is_mock.eq.true");
      }

      const { data, error } = await query;
      if (error) return fail(error.message);

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "list_couriers",
        entity_type: "courier",
        details: { count: data?.length ?? 0, filter: status_filter },
      });

      return ok({ success: true, data: data ?? [] });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────

    if (action === "create") {
      const {
        full_name,
        phone_number,
        bio = "",
        vehicle_type = "motorcycle",
        rating = 5.0,
        is_available = true,
        is_mock = false,
        is_verified = false,
        is_pinned = false,
        display_order = 0,
        show_on_home = true,
        avatar_url = null,
        vehicle_photo_url = null,
        create_auth_account = false,
        email,
        password,
        user_id = null,
      } = payload ?? {};

      if (!full_name?.trim()) return fail("الاسم الكامل مطلوب");
      if (!phone_number?.trim()) return fail("رقم الهاتف مطلوب");

      let resolvedUserId = user_id;

      if (create_auth_account && email && password) {
        const { data: authData, error: authErr } =
          await adminClient.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
          });
        if (authErr || !authData?.user) {
          return fail(`خطأ في إنشاء الحساب: ${authErr?.message}`);
        }
        resolvedUserId = authData.user.id;

        const { error: profileErr } = await adminClient
          .from("profiles")
          .upsert({ id: resolvedUserId, role: "courier" });
        if (profileErr) {
          await adminClient.auth.admin.deleteUser(resolvedUserId);
          return fail(`خطأ في إنشاء الملف الشخصي: ${profileErr.message}`);
        }
      }

      const { data: courier, error: insertErr } = await adminClient
        .from("couriers")
        .insert({
          user_id: resolvedUserId,
          full_name: full_name.trim(),
          phone_number: phone_number.trim(),
          bio: bio?.trim() || "",
          vehicle_type,
          rating: Number(rating) || 5.0,
          is_available: Boolean(is_available),
          is_mock: Boolean(is_mock),
          is_verified: Boolean(is_verified),
          is_pinned: Boolean(is_pinned),
          display_order: Number(display_order) || 0,
          show_on_home: Boolean(show_on_home),
          avatar_url: avatar_url || null,
          vehicle_photo_url: vehicle_photo_url || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        if (resolvedUserId && resolvedUserId !== user_id) {
          await adminClient.auth.admin.deleteUser(resolvedUserId);
        }
        return fail(insertErr.message);
      }

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "create_courier",
        entity_type: "courier",
        entity_id: courier.id,
        details: { full_name: courier.full_name, is_mock: courier.is_mock },
      });

      return ok({ success: true, data: courier });
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────

    if (action === "update") {
      const { id, ...updates } = payload ?? {};
      if (!id) return fail("معرف الموصل مطلوب");

      const allowed = [
        "full_name",
        "phone_number",
        "bio",
        "vehicle_type",
        "rating",
        "is_available",
        "is_mock",
        "is_verified",
        "is_pinned",
        "display_order",
        "show_on_home",
        "avatar_url",
        "vehicle_photo_url",
      ];
      const clean: Record<string, unknown> = {};
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          clean[key] = updates[key];
        }
      }

      if (clean.bio && String(clean.bio).length > 160) {
        return fail("السيرة الذاتية يجب أن تكون 160 حرفًا أو أقل");
      }
      if (clean.rating !== undefined) {
        const r = Number(clean.rating);
        if (r < 1 || r > 5) return fail("التقييم يجب أن يكون بين 1 و 5");
      }

      const { data: courier, error: updateErr } = await adminClient
        .from("couriers")
        .update(clean)
        .eq("id", id)
        .select("*")
        .single();

      if (updateErr) return fail(updateErr.message);

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "update_courier",
        entity_type: "courier",
        entity_id: id,
        details: clean as Record<string, unknown>,
      });

      return ok({ success: true, data: courier });
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────

    if (action === "delete") {
      const { id } = payload ?? {};
      if (!id) return fail("معرف الموصل مطلوب");

      const { error: deleteErr } = await adminClient
        .from("couriers")
        .delete()
        .eq("id", id);

      if (deleteErr) return fail(deleteErr.message);

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "delete_courier",
        entity_type: "courier",
        entity_id: id,
      });

      return ok({ success: true });
    }

    // ─── TOGGLES ─────────────────────────────────────────────────────────────

    if (["toggle_availability", "toggle_verified", "toggle_demo", "toggle_pinned", "toggle_home_visibility"].includes(action)) {
      const { id } = payload ?? {};
      if (!id) return fail("معرف الموصل مطلوب");

      const fieldMap: Record<string, string> = {
        toggle_availability: "is_available",
        toggle_verified: "is_verified",
        toggle_demo: "is_mock",
        toggle_pinned: "is_pinned",
        toggle_home_visibility: "show_on_home",
      };
      const field = fieldMap[action];
      if (!field) return fail("إجراء غير صالح");

      const { data: current, error: fetchErr } = await adminClient
        .from("couriers")
        .select(field)
        .eq("id", id)
        .single();
      if (fetchErr) return fail(fetchErr.message);

      const currentVal = Boolean(current?.[field]);
      const { data: courier, error: updateErr } = await adminClient
        .from("couriers")
        .update({ [field]: !currentVal })
        .eq("id", id)
        .select("*")
        .single();

      if (updateErr) return fail(updateErr.message);

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: action.replace("toggle_", "toggle_") + "_courier",
        entity_type: "courier",
        entity_id: id,
        details: { field, previous: currentVal, next: !currentVal },
      });

      return ok({ success: true, data: courier, toggled: !currentVal });
    }

    // ─── REORDER ─────────────────────────────────────────────────────────────

    if (action === "reorder") {
      const { id, display_order } = payload ?? {};
      if (!id || display_order === undefined) return fail("معرف الموصل والترتيب مطلوبان");

      const { data: courier, error: updateErr } = await adminClient
        .from("couriers")
        .update({ display_order: Number(display_order) })
        .eq("id", id)
        .select("*")
        .single();

      if (updateErr) return fail(updateErr.message);

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "reorder_courier",
        entity_type: "courier",
        entity_id: id,
        details: { display_order: Number(display_order) },
      });

      return ok({ success: true, data: courier });
    }

    return fail("إجراء غير معروف");
  } catch (err) {
    return fail(`خطأ داخلي: ${(err as Error).message}`);
  }
});
