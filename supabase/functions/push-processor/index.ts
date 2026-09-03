import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  data: Record<string, unknown> | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  delivery_status: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type NotificationPresentation = {
  sound: string;
  channelId: string;
};

function getNotificationPresentation(notificationType: string): NotificationPresentation {
  const type = notificationType.toLowerCase();
  if (["message", "chat", "chat_message"].includes(type)) {
    return { sound: "market_message.wav", channelId: "chat_messages" };
  }
  if (["new_order", "order_created", "transaction", "payment", "settlement"].includes(type)) {
    return { sound: "market_order.wav", channelId: "transactions" };
  }
  if (["delivery", "courier", "order_status", "delivery_status", "status_change"].includes(type)) {
    return { sound: "market_success.wav", channelId: "delivery_updates" };
  }
  if (["founder", "admin", "system_alert"].includes(type)) {
    return { sound: "market_alert.wav", channelId: "founder_alerts" };
  }
  return { sound: "default", channelId: "default" };
}

function safeData(record: NotificationRecord): Record<string, unknown> {
  const data = record.data ?? {};
  const result: Record<string, unknown> = { notification_type: record.notification_type };

  for (const key of ["conversation_id", "message_id", "order_id", "delivery_id", "assignment_id", "store_id", "product_id", "sender_id"]) {
    if (typeof data[key] === "string") result[key] = data[key];
  }

  if (record.related_entity_type === "orders" && record.related_entity_id) {
    result.order_id ??= record.related_entity_id;
  }
  if (record.related_entity_type === "chat_conversations" && record.related_entity_id) {
    result.conversation_id ??= record.related_entity_id;
  }

  if (result.conversation_id) {
    result.route = `/chat/${result.conversation_id}`;
  } else if (result.order_id) {
    result.route = `/customer/orders?orderId=${result.order_id}`;
  } else if (result.store_id) {
    result.route = `/store-details?id=${result.store_id}`;
  } else if (result.product_id) {
    result.route = `/product-details?id=${result.product_id}`;
  } else if (result.assignment_id) {
    result.route = `/driver/deliveries?assignmentId=${result.assignment_id}`;
  }

  return result;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (webhookSecret && request.headers.get("x-webhook-secret") !== webhookSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { record?: NotificationRecord };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const record = payload.record;
  if (!record?.id || !record.user_id || !record.title || !record.body) {
    return json({ error: "Notification record is required" }, 400);
  }
  if (record.delivery_status === "sent") return json({ skipped: true, reason: "already_sent" });

  const { data: devices, error: devicesError } = await supabaseAdmin
    .from("user_devices")
    .select("id, push_token, platform")
    .eq("user_id", record.user_id)
    .eq("is_active", true)
    .limit(50);

  if (devicesError) return json({ error: devicesError.message }, 500);
  if (!devices?.length) {
    await supabaseAdmin.from("notifications").update({ delivery_status: "failed" }).eq("id", record.id);
    return json({ sent: 0, reason: "no_active_devices" });
  }

  const presentation = getNotificationPresentation(record.notification_type);
  const mobileDevices = devices.filter((device) => device.platform === "android" || device.platform === "ios");
  const messages = mobileDevices.map((device) => ({
    to: device.push_token,
    sound: presentation.sound,
    title: record.title,
    body: record.body,
    data: safeData(record),
    channelId: presentation.channelId,
    badge: 1,
    priority: "high",
  }));

  if (!messages.length) return json({ sent: 0, reason: "no_mobile_devices" });

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  const expoResult = await expoResponse.json();
  const tickets = Array.isArray(expoResult?.data) ? expoResult.data : [];
  const invalidDeviceIds = tickets
    .map((item: { status?: string; details?: { error?: string } }, index: number) =>
      item.status === "error" && item.details?.error === "DeviceNotRegistered" ? mobileDevices[index]?.id : null,
    )
    .filter((id): id is string => Boolean(id));
  if (invalidDeviceIds.length) {
    await supabaseAdmin.from("user_devices").update({ is_active: false }).in("id", invalidDeviceIds);
  }
  const hasErrors = !expoResponse.ok || tickets.some((item: { status?: string }) => item.status === "error");
  await supabaseAdmin
    .from("notifications")
    .update({ delivery_status: hasErrors ? "failed" : "sent" })
    .eq("id", record.id);

  return json({ sent: hasErrors ? 0 : messages.length, expo: expoResult }, expoResponse.ok ? 200 : 502);
});
