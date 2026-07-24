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

// Facebook video URL patterns — accept all public embeddable formats generically.
// Supports: www, m, web, no subdomain. Accepts any non-empty shareId segment.
const FACEBOOK_VIDEO_PATTERNS = [
  // facebook.com/share/r/{shareId}/  (reel share)
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/share\/r\/[^\s/]+\/?$/i,
  // facebook.com/share/v/{shareId}/  (video share)
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/share\/v\/[^\s/]+\/?$/i,
  // facebook.com/reel/{reelId}/
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/reel\/[^\s/]+\/?$/i,
  // facebook.com/reels/{reelId}/
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/reels\/[^\s/]+\/?$/i,
  // facebook.com/watch?v={videoId}
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/watch\?v=[^\s&]+/i,
  // facebook.com/watch/{videoId}/
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/watch\/[^\s/]+\/?$/i,
  // facebook.com/{username}/videos/{videoId}/
  /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+\/videos\/[^\s/]+\/?$/i,
  // fb.watch/{videoId}
  /^(https?:\/\/)?(www\.)?fb\.watch\/[^\s/]+/?$/i,
];

// Must start with http:// or https:// — reject partial paths
function looksLikeFullUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

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
    // Strip only tracking/analytics query params — keep all others intact
    const trackingParams = [
      "ref", "utm_source", "utm_medium", "utm_campaign",
      "fbclid", "mibextid", "app", "xs", "sfid",
      "__tn__", "comment_id", "eids", "locale",
      "hc_location", "gdpr", "m_protocol",
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    // Remove trailing slash but keep query string intact
    let normalized = parsed.toString().replace(/\/+$/, "");
    return normalized;
  } catch {
    return url;
  }
}

async function fetchWithRedirect(
  url: string,
  maxRedirects = 5
): Promise<{ finalUrl: string; status: number; bodyUrl: string | null }> {
  let currentUrl = url;
  let redirects = 0;

  while (redirects < maxRedirects) {
    const res = await fetch(currentUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      redirects++;
      continue;
    }

    return { finalUrl: currentUrl, status: res.status, bodyUrl: null };
  }

  return { finalUrl: currentUrl, status: -1, bodyUrl: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { url, debug } = body as { url?: string; debug?: boolean };

    if (!url || typeof url !== "string") {
      return json({ ok: false, reason: "unsupported_or_private" }, 400);
    }

    // Validate full URL — reject partial paths
    if (!looksLikeFullUrl(url)) {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    // Validate Facebook video pattern
    if (!isValidFacebookVideoUrl(url)) {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    const normalizedUrl = normalizeFacebookUrl(url);
    const rawUrl = url;

    // Try Meta oEmbed with normalized URL
    let oembedUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(normalizedUrl)}`;
    let oembedRes = await fetch(oembedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    let oembedData: unknown = null;
    let oembedStatus = oembedRes.status;

    if (oembedRes.ok) {
      try {
        oembedData = await oembedRes.json();
      } catch {
        oembedData = null;
      }
    }

    // If first attempt failed or returned unsupported type, try redirect fallback
    const oembedType = (oembedData as { type?: string } | null)?.type;
    if (!oembedRes.ok || !oembedType || !["video", "rich"].includes(oembedType)) {
      // Resolve redirect and retry
      const redirectResult = await fetchWithRedirect(normalizedUrl);
      const resolvedUrl = redirectResult.finalUrl;

      // Retry oEmbed with resolved URL
      const retryUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(resolvedUrl)}`;
      const retryRes = await fetch(retryUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (retryRes.ok) {
        try {
          const retryData = await retryRes.json();
          const retryType = retryData?.type;
          if (retryType && ["video", "rich"].includes(retryType)) {
            oembedData = retryData;
            oembedStatus = retryRes.status;
            normalizedUrl = resolvedUrl;
          }
        } catch {
          // retry parse failed, keep original oembedData
        }
      }
    }

    // Validate final oEmbed type
    const finalType = (oembedData as { type?: string } | null)?.type;
    if (!finalType || !["video", "rich"].includes(finalType)) {
      const resp: { ok: boolean; reason: string } = {
        ok: false,
        reason: "unsupported_or_private",
      };
      if (debug) {
        resp.raw_url = rawUrl;
        resp.normalized_url = normalizedUrl;
        resp.oembed_status = oembedStatus;
        resp.oembed_body = oembedData;
      }
      return json(resp, 200);
    }

    // Build embed URL using the final normalized URL
    const finalNormalized = normalizedUrl;
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(finalNormalized)}&show_text=false&width=500`;

    const resp: {
      ok: boolean;
      provider: string;
      normalized_url: string;
      embed_url: string;
      embed_html: string | null;
      thumbnail_url: string | null;
      title: string | null;
    } = {
      ok: true,
      provider: "facebook",
      normalized_url: finalNormalized,
      embed_url: embedUrl,
      embed_html: (oembedData as { html?: string | null })?.html ?? null,
      thumbnail_url: (oembedData as { thumbnail_url?: string | null })?.thumbnail_url ?? null,
      title: (oembedData as { title?: string | null })?.title ?? null,
    };

    if (debug) {
      resp.raw_url = rawUrl;
      resp.resolved_url = finalNormalized;
      resp.oembed_status = oembedStatus;
      resp.oembed_body = oembedData;
    }

    return json(resp);
  } catch (err) {
    return json({ ok: false, reason: "unsupported_or_private" }, 200);
  }
});
