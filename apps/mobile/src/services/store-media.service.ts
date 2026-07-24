import { supabase } from "@/lib/supabase";
import { StoreVideo } from "@/types/schema-03-core";

// ============================================================================
// Types — match the resolve-store-video Edge Function response
// ============================================================================

export type MediaProvider = "facebook" | "youtube" | "tiktok" | "instagram";

export type RejectionReason =
  | "invalid_url"
  | "unsupported_provider"
  | "private_or_restricted"
  | "not_found_or_deleted"
  | "oembed_unavailable"
  | "network_error"
  | "blocked_host";

export interface ResolveStoreVideoRequest {
  url: string;
  store_id: string;
}

export interface ResolveStoreVideoSuccess {
  ok: true;
  provider: MediaProvider;
  original_url: string;
  normalized_url: string;
  embed_url: string | null;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
}

export interface ResolveStoreVideoFailure {
  ok: false;
  provider: MediaProvider | null;
  reason: RejectionReason;
  message_ar: string;
}

export type ResolveStoreVideoResponse = ResolveStoreVideoSuccess | ResolveStoreVideoFailure;

// ============================================================================
// Arabic rejection messages — match Edge Function + client-side validation
// ============================================================================

const REJECTION_AR: Record<RejectionReason, string> = {
  invalid_url: "يرجى لصق رابط فيديو كاملًا يبدأ بـ https://",
  unsupported_provider: "هذه المنصة غير مدعومة حاليًا للعرض داخل السوق",
  private_or_restricted: "هذا الفيديو خاص أو مقيّد ولا يمكن عرضه داخل السوق",
  not_found_or_deleted: "الفيديو غير موجود أو تم حذفه",
  oembed_unavailable: "تعذّر التحقق من الفيديو — قد يكون خاصًا أو محذوفًا",
  network_error: "حدث خطأ في الاتصال، حاول مرة أخرى",
  blocked_host: "هذا الرابط غير مسموح به",
};

export function rejectionMessageAr(reason: RejectionReason): string {
  return REJECTION_AR[reason];
}

// ============================================================================
// Client-side URL validation (before calling Edge Function)
// ============================================================================

export function validateVideoUrl(url: string): { valid: true; url: string } | { valid: false; reason: "invalid_url" | "blocked_host" } {
  if (!url || typeof url !== "string") {
    return { valid: false, reason: "invalid_url" };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { valid: false, reason: "invalid_url" };
  }
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = new Set([
      "facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com",
      "fb.watch",
      "youtube.com", "www.youtube.com", "youtu.be",
      "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
      "instagram.com", "www.instagram.com",
    ]);
    if (!allowedHosts.has(hostname)) {
      return { valid: false, reason: "blocked_host" };
    }
  } catch {
    return { valid: false, reason: "invalid_url" };
  }
  return { valid: true, url: url.trim() };
}

// ============================================================================
// Core: Resolve a video URL via the resolve-store-video Edge Function
// ============================================================================

export async function resolveStoreVideo(
  url: string,
  storeId: string
): Promise<ResolveStoreVideoResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("resolve-store-video", {
      body: { url, store_id: storeId },
    });

    if (error) {
      return {
        ok: false,
        provider: null,
        reason: "network_error",
        message_ar: REJECTION_AR.network_error,
      };
    }

    return data as ResolveStoreVideoResponse;
  } catch (e: any) {
    return {
      ok: false,
      provider: null,
      reason: "network_error",
      message_ar: REJECTION_AR.network_error,
    };
  }
}

// ============================================================================
// Core: Add a store video (Founder/Admin flow)
//
// 1. Validate URL client-side
// 2. Call resolve-store-video
// 3. On success: insert into store_videos (can_embed=true)
// 4. On failure: do NOT insert — return Arabic rejection reason
// ============================================================================

export async function addStoreVideo(
  storeId: string,
  url: string,
  title?: string | null
): Promise<{ video: StoreVideo | null; error: string | null }> {
  // Step 1: client-side validation
  const validation = validateVideoUrl(url);
  if (!validation.valid) {
    return { video: null, error: rejectionMessageAr(validation.reason) };
  }

  // Step 2: resolve via Edge Function
  const resolution = await resolveStoreVideo(validation.url, storeId);

  if (!resolution.ok) {
    return { video: null, error: resolution.message_ar ?? rejectionMessageAr(resolution.reason) };
  }

  // Step 3: insert only if resolver confirmed embeddability
  const d = resolution;
  const { data: video, error: insertErr } = await supabase
    .from("store_videos")
    .insert({
      store_id: storeId,
      original_url: url,
      provider: d.provider,
      normalized_url: d.normalized_url,
      embed_url: d.embed_url,
      embed_html: d.embed_html,
      thumbnail_url: d.thumbnail_url,
      title: d.title ?? title ?? null,
      author_name: d.author_name,
      can_embed: true,
      is_visible: true,
      meta_checked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) {
    return { video: null, error: insertErr.message };
  }

  return { video: video as StoreVideo, error: null };
}

// ============================================================================
// Core: List embeddable videos for public store display
// ============================================================================

export async function getPublicStoreVideos(
  storeId: string
): Promise<StoreVideo[]> {
  if (!storeId) return [];

  // Select only safe embeddable columns — never original_url to public
  const { data, error } = await supabase
    .from("store_videos")
    .select("id, provider, embed_url, embed_html, thumbnail_url, title, author_name")
    .eq("store_id", storeId)
    .eq("can_embed", true)
    .eq("is_visible", true)
    .not("embed_url", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching public store videos:", error);
    return [];
  }

  return (data ?? []) as StoreVideo[];
}

// ============================================================================
// Core: List all videos for Founder/Admin (includes original_url, can_embed=false rows)
// ============================================================================

export async function getFounderStoreVideos(
  storeId: string
): Promise<StoreVideo[]> {
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("store_videos")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching all store videos:", error);
    return [];
  }

  return (data ?? []) as StoreVideo[];
}
