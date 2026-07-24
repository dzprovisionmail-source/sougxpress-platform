// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ============================================================================
// Host allowlist — SSRF protection
// ============================================================================
const ALLOWED_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
]);

// ============================================================================
// Provider detection
// ============================================================================
type MediaProvider = "facebook" | "youtube" | "tiktok" | "instagram";

const HOST_PROVIDER_MAP: Record<string, MediaProvider> = {
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "web.facebook.com": "facebook",
  "fb.watch": "facebook",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
};

function detectProvider(hostname: string): MediaProvider | null {
  return HOST_PROVIDER_MAP[hostname.toLowerCase()] ?? null;
}

// ============================================================================
// URL helpers
// ============================================================================
function looksLikeFullUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function parseUrlsafe(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isAllowedHost(parsed: URL): boolean {
  return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
}

const TRACKING_PARAMS = new Set([
  "ref", "utm_source", "utm_medium", "utm_campaign",
  "fbclid", "mibextid", "app", "xs", "sfid",
  "__tn__", "comment_id", "eids", "locale",
  "hc_location", "gdpr", "igshid",
]);

// ============================================================================
// oEmbed fetcher
// ============================================================================
async function fetchOembed(
  oembedUrl: string,
  timeoutMs = 10000
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; body: unknown }> {
  try {
    const res = await fetch(oembedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      let body: unknown = null;
      try { body = await res.json(); } catch { /* non-JSON */ }
      return { ok: false, status: res.status, body };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, status: -1, body: (err as Error).message };
  }
}

function isVideoOrRich(data: unknown): boolean {
  const typed = data as { type?: string } | null;
  return typed?.type === "video" || typed?.type === "rich";
}

// ============================================================================
// YouTube resolver
// ============================================================================
function extractYouTubeId(u: URL): string | null {
  if (u.hostname === "youtu.be") return u.pathname.split("/")[1] ?? null;
  if (u.pathname === "/watch") return u.searchParams.get("v");
  if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
  return null;
}

function normalizeYouTubeUrl(u: URL): string {
  const u2 = new URL(u.toString());
  u2.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key)) u2.searchParams.delete(key);
  });
  return u2.toString().replace(/\/+$/, "");
}

async function resolveYouTube(u: URL): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string; debug_detail: string }
> {
  const videoId = extractYouTubeId(u);
  const normalized = normalizeYouTubeUrl(u);

  if (!videoId) {
    return { ok: false, reason: "invalid_url", debug_detail: "Could not extract YouTube video ID" };
  }

  // YouTube oEmbed for metadata
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`;
  const result = await fetchOembed(oembedUrl);

  if (result.ok && result.data) {
    const d = result.data as Record<string, unknown>;
    return {
      ok: true,
      data: {
        normalized_url: normalized,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        embed_html: null,
        thumbnail_url: (d.thumbnail_url as string) ?? null,
        title: (d.title as string) ?? null,
        author_name: (d.author_name as string) ?? null,
      },
    };
  }

  // oEmbed failed but URL is valid — still accept it
  return {
    ok: true,
    data: {
      normalized_url: normalized,
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      embed_html: null,
      thumbnail_url: null,
      title: null,
      author_name: null,
    },
  };
}

// ============================================================================
// Facebook resolver
// ============================================================================
function normalizeFacebookUrl(u: URL): string {
  const u2 = new URL(u.toString());
  u2.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key)) u2.searchParams.delete(key);
  });
  return u2.toString().replace(/\/+$/, "");
}

async function resolveFacebook(u: URL): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string; debug_detail: string }
> {
  const normalized = normalizeFacebookUrl(u);

  // Try Facebook oEmbed
  const oembedUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(normalized)}`;
  const result = await fetchOembed(oembedUrl);

  if (result.ok && isVideoOrRich(result.data)) {
    const d = result.data as Record<string, unknown>;
    return {
      ok: true,
      data: {
        normalized_url: normalized,
        embed_url: null,
        embed_html: (d.html as string) ?? null,
        thumbnail_url: (d.thumbnail_url as string) ?? null,
        title: (d.title as string) ?? null,
        author_name: null,
      },
    };
  }

  // Fallback: use Facebook plugin URL for WebView
  const pluginUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false&width=500`;
  return {
    ok: true,
    data: {
      normalized_url: normalized,
      embed_url: pluginUrl,
      embed_html: null,
      thumbnail_url: null,
      title: null,
      author_name: null,
    },
  };
}

// ============================================================================
// TikTok resolver (detects, normalizes, but rejects gracefully)
// ============================================================================
function normalizeTikTokUrl(u: URL): string {
  const u2 = new URL(u.toString());
  u2.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key)) u2.searchParams.delete(key);
  });
  return u2.toString().replace(/\/+$/, "");
}

async function resolveTikTok(u: URL): Promise<{ ok: false; reason: string; debug_detail: string }> {
  const normalized = normalizeTikTokUrl(u);
  // TikTok oEmbed is available but Phase A rejects it gracefully
  return {
    ok: false,
    reason: "unsupported_provider",
    debug_detail: `TikTok URL normalized but embedding not yet supported in Phase A: ${normalized}`,
  };
}

// ============================================================================
// Instagram resolver (rejects gracefully — Phase C)
// ============================================================================
async function resolveInstagram(u: URL): Promise<{ ok: false; reason: string; debug_detail: string }> {
  const normalized = u.toString().replace(/\/+$/, "");
  return {
    ok: false,
    reason: "unsupported_provider",
    debug_detail: `Instagram embedding requires a Meta Developer App client token (Phase C): ${normalized}`,
  };
}

// ============================================================================
// Main handler
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { url, store_id, debug } = body as {
      url?: string;
      store_id?: string;
      debug?: boolean;
    };

    // --- Step 1: basic URL validation ---
    if (!url || typeof url !== "string") {
      return json({ ok: false, reason: "invalid_url", debug_detail: debug ? "Missing url parameter" : undefined });
    }

    if (!looksLikeFullUrl(url)) {
      return json({
        ok: false,
        reason: "invalid_url",
        debug_detail: debug ? "URL must start with https://" : undefined,
      });
    }

    // --- Step 2: host allowlist ---
    const parsed = parseUrlsafe(url);
    if (!parsed) {
      return json({
        ok: false,
        reason: "invalid_url",
        debug_detail: debug ? "Cannot parse URL" : undefined,
      });
    }

    if (!isAllowedHost(parsed)) {
      return json({
        ok: false,
        reason: "blocked_host",
        debug_detail: debug ? `Host "${parsed.hostname}" is not allowed` : undefined,
      });
    }

    // --- Step 3: provider detection ---
    const hostname = parsed.hostname.toLowerCase();
    const provider = detectProvider(hostname);
    if (!provider) {
      return json({
        ok: false,
        reason: "unsupported_provider",
        debug_detail: debug ? `No provider mapping for host "${hostname}"` : undefined,
      });
    }

    // --- Step 4: resolve per provider ---
    let resolution;
    switch (provider) {
      case "youtube":
        resolution = await resolveYouTube(parsed);
        break;
      case "facebook":
        resolution = await resolveFacebook(parsed);
        break;
      case "tiktok":
        resolution = await resolveTikTok(parsed);
        break;
      case "instagram":
        resolution = await resolveInstagram(parsed);
        break;
      default:
        resolution = { ok: false, reason: "unsupported_provider", debug_detail: `Provider "${provider}" is not supported in Phase A` };
    }

    if (!resolution.ok) {
      return json({
        ok: false,
        provider,
        reason: resolution.reason,
        message_ar: provider === "tiktok"
          ? "تيك توك غير مدعوم حالياً — سيتم إضافة التضمين لاحقاً"
          : "إنستغرام غير مدعوم حالياً — يتطلب تسجيل تطبيق Meta Developer",
        debug_detail: debug ? resolution.debug_detail : undefined,
      });
    }

    // --- Success ---
    const d = resolution.data;
    const resp: Record<string, unknown> = {
      ok: true,
      provider,
      original_url: url,
      normalized_url: d.normalized_url,
      embed_url: d.embed_url,
      embed_html: d.embed_html,
      thumbnail_url: d.thumbnail_url,
      title: d.title,
      author_name: d.author_name,
    };

    if (debug) {
      resp.debug_detail = resolution.debug_detail ?? null;
    }

    return json(resp);
  } catch (err) {
    return json({
      ok: false,
      reason: "network_error",
      message_ar: "حدث خطأ في الاتصال، حاول مرة أخرى",
      debug_detail: debug ? (err as Error).message : undefined,
    });
  }
});
