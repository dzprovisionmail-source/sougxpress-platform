import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "www.fb.watch",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
]);

const HOST_PROVIDER_MAP: Record<string, string> = {
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "web.facebook.com": "facebook",
  "fb.watch": "facebook",
  "www.fb.watch": "facebook",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
};

type MediaProvider = "facebook" | "youtube" | "tiktok" | "instagram";

type RejectionReason =
  | "invalid_url"
  | "unsupported_provider"
  | "private_or_restricted"
  | "not_found_or_deleted"
  | "oembed_unavailable"
  | "network_error"
  | "blocked_host";

interface SuccessResponse {
  ok: true;
  provider: MediaProvider;
  normalized_url: string;
  embed_url: string;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
}

interface FailureResponse {
  ok: false;
  provider: MediaProvider | null;
  reason: RejectionReason;
  message_ar: string;
  debug_detail: string;
}

type ResolveResponse = SuccessResponse | FailureResponse;

const REASON_MESSAGES_AR: Record<RejectionReason, string> = {
  invalid_url: "الرابط غير صالح",
  unsupported_provider: "هذه المنصة غير مدعومة حالياً",
  private_or_restricted: "هذا الفيديو خاص أو مقيّد ولا يمكن عرضه",
  not_found_or_deleted: "الفيديو غير موجود أو تم حذفه",
  oembed_unavailable: "تعذّر التحقق من الفيديو حالياً",
  network_error: "حدث خطأ في الاتصال، حاول مرة أخرى",
  blocked_host: "هذا الرابط غير مسموح به",
};

function json(body: ResolveResponse | { ok: false; reason: string; message_ar?: string }, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function looksLikeFullUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function detectProvider(rawUrl: string): MediaProvider | null {
  if (!looksLikeFullUrl(rawUrl)) return null;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return HOST_PROVIDER_MAP[host] ?? null;
  } catch {
    return null;
  }
}

function buildFailure(
  provider: MediaProvider | null,
  reason: RejectionReason,
  debugDetail: string
): FailureResponse {
  return {
    ok: false,
    provider,
    reason,
    message_ar: REASON_MESSAGES_AR[reason],
    debug_detail: debugDetail,
  };
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeYouTubeUrl(rawUrl: string): string {
  const id = extractYouTubeId(rawUrl);
  if (!id) return rawUrl;
  return `https://www.youtube.com/embed/${id}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveYouTube(rawUrl: string): Promise<SuccessResponse> {
  const id = extractYouTubeId(rawUrl);
  if (!id) {
    throw new Error("invalid_youtube_id");
  }

  const normalizedUrl = `https://www.youtube.com/embed/${id}`;
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  let title: string | null = null;
  let authorName: string | null = null;
  let thumbnailUrl: string | null = null;
  let embedHtml: string | null = null;

  try {
    const res = await fetchWithTimeout(oembedUrl, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      title = typeof data.title === "string" ? data.title : null;
      authorName = typeof data.author_name === "string" ? data.author_name : null;
      thumbnailUrl = typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
      embedHtml = typeof data.html === "string" ? data.html : null;
    }
  } catch {
    // oEmbed is optional for YouTube; embed_url is sufficient
  }

  return {
    ok: true,
    provider: "youtube",
    normalized_url: normalizedUrl,
    embed_url: normalizedUrl,
    embed_html: embedHtml,
    thumbnail_url: thumbnailUrl,
    title: title,
    author_name: authorName,
  };
}

const FACEBOOK_VIDEO_PATTERNS = [
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/share\/r\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/share\/v\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/reel\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/reels\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/watch\?v=[^\s&]+/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/watch\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+\/videos\/[^\s/]+\/?$/i,
  /^(https?:\/\/)?(www\.)?fb\.watch\/[^\s/]+\/?$/i,
];

const FB_TRACKING_PARAMS = [
  "ref",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "fbclid",
  "mibextid",
  "app",
  "xs",
  "sfid",
  "__tn__",
  "comment_id",
  "eids",
  "locale",
  "hc_location",
  "gdpr",
  "m_protocol",
];

function isValidFacebookVideoUrl(url: string): boolean {
  if (!looksLikeFullUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const origin = parsed.origin.toLowerCase();
    const allowed = [
      "https://www.facebook.com",
      "https://facebook.com",
      "https://m.facebook.com",
      "https://web.facebook.com",
      "https://www.fb.watch",
      "https://fb.watch",
    ];
    if (!allowed.includes(origin)) return false;
    return FACEBOOK_VIDEO_PATTERNS.some((pat) => pat.test(url));
  } catch {
    return false;
  }
}

function normalizeFacebookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const p of FB_TRACKING_PARAMS) {
      parsed.searchParams.delete(p);
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url;
  }
}

async function fetchWithRedirect(
  url: string,
  maxRedirects = 5
): Promise<{ finalUrl: string; status: number }> {
  let currentUrl = url;
  let redirects = 0;

  while (redirects < maxRedirects) {
    const res = await fetchWithTimeout(currentUrl, {}, 8000);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      redirects++;
      continue;
    }
    return { finalUrl: currentUrl, status: res.status };
  }

  return { finalUrl: currentUrl, status: -1 };
}

async function resolveFacebook(rawUrl: string): Promise<SuccessResponse> {
  const normalizedUrl = normalizeFacebookUrl(rawUrl);

  let oembedData: Record<string, unknown> | null = null;
  let oembedStatus = 0;

  let oembedUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(normalizedUrl)}`;
  let oembedRes = await fetchWithTimeout(oembedUrl, {
    headers: { Accept: "application/json" },
  });

  if (oembedRes.ok) {
    try {
      oembedData = (await oembedRes.json()) as Record<string, unknown>;
      oembedStatus = oembedRes.status;
    } catch {
      oembedData = null;
    }
  }

  const oembedType = oembedData?.type as string | undefined;
  if (!oembedRes.ok || !oembedType || !["video", "rich"].includes(oembedType)) {
    const redirectResult = await fetchWithRedirect(normalizedUrl);
    const resolvedUrl = redirectResult.finalUrl;

    const retryUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(resolvedUrl)}`;
    const retryRes = await fetchWithTimeout(retryUrl, {
      headers: { Accept: "application/json" },
    });

    if (retryRes.ok) {
      try {
        const retryData = (await retryRes.json()) as Record<string, unknown>;
        const retryType = retryData?.type as string | undefined;
        if (retryType && ["video", "rich"].includes(retryType)) {
          oembedData = retryData;
          oembedStatus = retryRes.status;
          normalizedUrl = resolvedUrl;
        }
      } catch {
        // retry parse failed
      }
    }
  }

  const finalType = oembedData?.type as string | undefined;
  if (!finalType || !["video", "rich"].includes(finalType)) {
    throw new Error(`facebook_oembed_failed: status=${oembedStatus}`);
  }

  const finalNormalized = normalizedUrl;
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(finalNormalized)}&show_text=false&width=500`;

  return {
    ok: true,
    provider: "facebook",
    normalized_url: finalNormalized,
    embed_url: embedUrl,
    embed_html: typeof oembedData.html === "string" ? oembedData.html : null,
    thumbnail_url: typeof oembedData.thumbnail_url === "string" ? oembedData.thumbnail_url : null,
    title: typeof oembedData.title === "string" ? oembedData.title : null,
    author_name: typeof oembedData.author_name === "string" ? oembedData.author_name : null,
  };
}

async function resolveTikTok(rawUrl: string): Promise<SuccessResponse> {
  // TikTok has oEmbed support but embed_html wrapping is Phase B.
  // Reject gracefully in Phase A.
  throw new Error("tiktok_phase_b");
}

async function resolveInstagram(rawUrl: string): Promise<SuccessResponse> {
  // Instagram requires client access token for oEmbed.
  // Reject gracefully in Phase A.
  throw new Error("instagram_phase_c");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = (await req.json()) as { url?: string; store_id?: string };
    const { url, store_id } = body;

    if (!url || typeof url !== "string" || !looksLikeFullUrl(url.trim())) {
      return json(buildFailure(null, "invalid_url", `URL missing or invalid: ${url ?? "undefined"}`), 200);
    }

    const trimmedUrl = url.trim();
    const provider = detectProvider(trimmedUrl);

    if (!provider) {
      return json(buildFailure(null, "unsupported_provider", `Host not in allowlist: ${new URL(trimmedUrl).hostname}`), 200);
    }

    if (provider === "tiktok" || provider === "instagram") {
      return json(
        buildFailure(provider, "unsupported_provider", `Provider ${provider} is planned for Phase B/C`),
        200
      );
    }

    try {
      let result: SuccessResponse;
      if (provider === "youtube") {
        result = await resolveYouTube(trimmedUrl);
      } else if (provider === "facebook") {
        if (!isValidFacebookVideoUrl(trimmedUrl)) {
          return json(buildFailure(provider, "invalid_url", "URL does not match any supported Facebook video pattern"), 200);
        }
        result = await resolveFacebook(trimmedUrl);
      } else {
        return json(buildFailure(provider, "unsupported_provider", `Unhandled provider: ${provider}`), 200);
      }

      return json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      let reason: RejectionReason = "network_error";

      if (message.includes("private_or_restricted") || message.includes("oembed_failed")) {
        reason = "oembed_unavailable";
      } else if (message.includes("not_found") || message.includes("404")) {
        reason = "not_found_or_deleted";
      } else if (message.includes("invalid_youtube_id")) {
        reason = "invalid_url";
      }

      return json(buildFailure(provider, reason, message), 200);
    }
  } catch {
    return json(buildFailure(null, "network_error", "Unhandled server error"), 500);
  }
});
