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

// Facebook video URL patterns — accept all public embeddable Facebook video formats
const FACEBOOK_VIDEO_PATTERNS = [
  // facebook.com/share/r/* (reel share URL)
  /^(https?:\/\/)?(www\.)?facebook\.com\/share\/r\/.+/i,
  // facebook.com/share/v/* (video share URL)
  /^(https?:\/\/)?(www\.)?facebook\.com\/share\/v\/.+/i,
  // facebook.com/reel/*
  /^(https?:\/\/)?(www\.)?facebook\.com\/reel\/.+/i,
  // facebook.com/reels/* (plural)
  /^(https?:\/\/)?(www\.)?facebook\.com\/reels\/.+/i,
  // facebook.com/watch?v=*
  /^(https?:\/\/)?(www\.)?facebook\.com\/watch\?v=.+/i,
  // facebook.com/watch/*
  /^(https?:\/\/)?(www\.)?facebook\.com\/watch\/.+/i,
  // facebook.com/*/videos/*
  /^(https?:\/\/)?(www\.)?facebook\.com\/.+\/videos\/.+/i,
  // fb.watch/*
  /^(https?:\/\/)?(www\.)?fb\.watch\/.+/i,
];

const ALLOWED_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://facebook.com",
  "https://www.fb.watch",
  "https://fb.watch",
]);

function isValidFacebookVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_ORIGINS.has(parsed.origin)) {
      return false;
    }
    return FACEBOOK_VIDEO_PATTERNS.some((pat) => pat.test(url));
  } catch {
    return false;
  }
}

function normalizeFacebookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip tracking parameters only — preserve the path and core query params
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("fbclid");
    parsed.searchParams.delete("mibextid");
    parsed.searchParams.delete("app");
    parsed.searchParams.delete("xs");
    parsed.searchParams.delete("sfid");
    parsed.searchParams.delete("__tn__");
    parsed.searchParams.delete("comment_id");
    // Remove trailing slash
    let normalized = parsed.toString().replace(/\/+$/, "");
    return normalized;
  } catch {
    return url;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return json({ ok: false, reason: "unsupported_or_private" }, 400);
    }

    if (!isValidFacebookVideoUrl(url)) {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    const normalizedUrl = normalizeFacebookUrl(url);

    // Call tokenless Meta oEmbed
    const oembedUrl = `https://graph.facebook.com/v25.0/oembed_video?url=${encodeURIComponent(normalizedUrl)}`;

    let oembedRes;
    try {
      oembedRes = await fetch(oembedUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    if (!oembedRes.ok) {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    let oembedData;
    try {
      oembedData = await oembedRes.json();
    } catch {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    // Validate response type
    const oembedType = oembedData?.type;
    if (!oembedType || !["video", "rich"].includes(oembedType)) {
      return json({ ok: false, reason: "unsupported_or_private" }, 200);
    }

    // Build embed URL
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalizedUrl)}&show_text=false&width=500`;

    return json({
      ok: true,
      provider: "facebook",
      normalized_url: normalizedUrl,
      embed_url: embedUrl,
      embed_html: oembedData.html ?? null,
      thumbnail_url: oembedData.thumbnail_url ?? null,
      title: oembedData.title ?? null,
    });
  } catch (err) {
    return json({ ok: false, reason: "unsupported_or_private" }, 200);
  }
});
