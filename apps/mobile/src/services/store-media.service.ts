import { supabase } from "@/lib/supabase";
import { StoreVideo } from "@/types/schema-03-core";

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export type MediaProvider = "facebook" | "youtube" | "tiktok" | "instagram";

export type RejectionReason =
  | "invalid_url"
  | "unsupported_provider"
  | "private_or_restricted"
  | "not_found_or_deleted"
  | "oembed_unavailable"
  | "network_error"
  | "blocked_host";

export interface ResolveSuccess {
  ok: true;
  provider: MediaProvider;
  normalized_url: string;
  embed_url: string;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
}

export interface ResolveFailure {
  ok: false;
  provider: MediaProvider | null;
  reason: RejectionReason;
  message_ar: string;
  debug_detail: string;
}

export type ResolveResult = ResolveSuccess | ResolveFailure;

export interface PublicStoreVideo {
  id: string;
  provider: MediaProvider;
  embed_url: string;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
}

export async function resolveStoreVideo(url: string, storeId: string): Promise<ResolveResult> {
  if (!url || typeof url !== "string") {
    return {
      ok: false,
      provider: null,
      reason: "invalid_url",
      message_ar: "الرابط غير صالح",
      debug_detail: "URL is empty or not a string",
    };
  }

  const { data, error } = await supabase.functions.invoke("resolve-store-video", {
    body: { url, store_id: storeId },
  });

  if (error) {
    return {
      ok: false,
      provider: null,
      reason: "network_error",
      message_ar: "حدث خطأ في الاتصال، حاول مرة أخرى",
      debug_detail: error.message || String(error),
    };
  }

  const result = data as ResolveResult;
  if (!result || !("ok" in result)) {
    return {
      ok: false,
      provider: null,
      reason: "network_error",
      message_ar: "حدث خطأ في الاتصال، حاول مرة أخرى",
      debug_detail: `Unexpected response shape: ${JSON.stringify(data)}`,
    };
  }

  return result;
}

export async function addStoreVideo(
  storeId: string,
  url: string,
  title?: string | null
): Promise<{ video: StoreVideo | null; error: string | null }> {
  if (!storeId || !isValidUUID(storeId)) {
    return { video: null, error: "معرّف المتجر غير صالح" };
  }

  const resolved = await resolveStoreVideo(url, storeId);

  if (!resolved.ok) {
    await logVideoRejection(storeId, url, resolved as Exclude<ResolveResult, ResolveSuccess>);
    return {
      video: null,
      error: (resolved as Exclude<ResolveResult, ResolveSuccess>).message_ar,
    };
  }

  try {
    const { data: video, error: insertErr } = await supabase
      .from("store_videos")
      .insert({
        store_id: storeId,
        url,
        title: title ?? resolved.title ?? null,
        platform: resolved.provider,
        provider: resolved.provider,
        normalized_url: resolved.normalized_url,
        embed_url: resolved.embed_url,
        embed_html: resolved.embed_html,
        thumbnail_url: resolved.thumbnail_url,
        author_name: resolved.author_name,
        can_embed: true,
        is_visible: true,
        meta_checked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    return { video: video as StoreVideo, error: null };
  } catch (e: any) {
    console.error("addStoreVideo insert error:", e);
    return { video: null, error: e.message || "فشل إضافة الفيديو" };
  }
}

export async function logVideoRejection(
  storeId: string,
  originalUrl: string,
  result: Exclude<ResolveResult, ResolveSuccess>,
  createdBy?: string | null
): Promise<void> {
  if (!storeId || !isValidUUID(storeId)) return;

  try {
    await supabase.from("store_video_rejections").insert({
      store_id: storeId,
      provider: result.provider,
      original_url: originalUrl,
      reason: result.reason,
      message_ar: result.message_ar,
      debug_detail: result.debug_detail,
      created_by: createdBy ?? null,
    });
  } catch (e) {
    console.error("Failed to log video rejection:", e);
  }
}

export async function getPublicStoreVideos(storeId: string): Promise<PublicStoreVideo[]> {
  if (!storeId || !isValidUUID(storeId)) return [];

  const { data, error } = await supabase
    .from("store_videos")
    .select("id, provider, embed_url, embed_html, thumbnail_url, title")
    .eq("store_id", storeId)
    .eq("can_embed", true)
    .eq("is_visible", true)
    .not("embed_url", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching public store videos:", error);
    return [];
  }

  return (data ?? []) as PublicStoreVideo[];
}

export async function getFounderStoreVideos(storeId: string): Promise<StoreVideo[]> {
  if (!storeId || !isValidUUID(storeId)) return [];

  const { data, error } = await supabase
    .from("store_videos")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching founder store videos:", error);
    return [];
  }

  return (data ?? []) as StoreVideo[];
}

export async function deleteStoreVideo(id: string): Promise<void> {
  if (!id || !isValidUUID(id)) {
    throw new Error("معرّف الفيديو غير صالح");
  }

  const { error } = await supabase.from("store_videos").delete().eq("id", id);
  if (error) throw new Error(error.message || "فشل حذف الفيديو");
}
