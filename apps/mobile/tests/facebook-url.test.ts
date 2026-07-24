// Standalone test script for Facebook URL validator/normalizer.
// Run with: npx tsx tests/facebook-url.test.ts
//
// Validates all Facebook shared link formats generically — no hardcoded real IDs.

interface TestCase {
  label: string;
  url: string;
  expectedValid: boolean;
}

interface NormalizeTestCase {
  label: string;
  url: string;
  expectedNormalized: string;
}

// ─── Patterns (copied from Edge Function) ──────────────────────────────────
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
  /^(https?:\/\/)?(www\.)?fb\.watch\/[^\s/]+\/?$/i,
];

const ALLOWED_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://facebook.com",
  "https://m.facebook.com",
  "https://web.facebook.com",
  "https://www.fb.watch",
  "https://fb.watch",
]);

function looksLikeFullUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isValidFacebookVideoUrl(url: string): boolean {
  if (!looksLikeFullUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const origin = parsed.origin.toLowerCase();
    if (!ALLOWED_ORIGINS.has(origin)) return false;
    return FACEBOOK_VIDEO_PATTERNS.some((pat) => pat.test(url));
  } catch {
    return false;
  }
}

function normalizeFacebookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingParams = [
      "ref", "utm_source", "utm_medium", "utm_campaign",
      "fbclid", "mibextid", "app", "xs", "sfid",
      "__tn__", "comment_id", "eids", "locale",
      "hc_location", "gdpr", "m_protocol",
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    let normalized = parsed.toString().replace(/\/+$/, "");
    return normalized;
  } catch {
    return url;
  }
}

// ─── Test runner ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
  }
}

// ─── Validation Tests ─────────────────────────────────────────────────────

console.log("\n=== Facebook URL Validator Tests ===\n");

// Accepted formats — share/reel/watch/videos with various subdomains
const acceptTests: TestCase[] = [
  // Standard share/reel URLs — any subdomain
  { label: "www.facebook.com/share/r/ABC123/", url: "https://www.facebook.com/share/r/ABC123/", expectedValid: true },
  { label: "www.facebook.com/share/v/XYZ789/", url: "https://www.facebook.com/share/v/XYZ789/", expectedValid: true },
  { label: "m.facebook.com/share/r/ABC123/", url: "https://m.facebook.com/share/r/ABC123/", expectedValid: true },
  { label: "m.facebook.com/share/v/XYZ789/", url: "https://m.facebook.com/share/v/XYZ789/", expectedValid: true },
  { label: "web.facebook.com/share/r/ABC123/", url: "https://web.facebook.com/share/r/ABC123/", expectedValid: true },
  { label: "web.facebook.com/share/v/XYZ789/", url: "https://web.facebook.com/share/v/XYZ789/", expectedValid: true },
  { label: "facebook.com/share/r/ABC123/", url: "https://facebook.com/share/r/ABC123/", expectedValid: true },
  { label: "facebook.com/share/v/XYZ789/", url: "https://facebook.com/share/v/XYZ789/", expectedValid: true },
  // Reel formats
  { label: "www.facebook.com/reel/REEL_ID_1/", url: "https://www.facebook.com/reel/REEL_ID_1/", expectedValid: true },
  { label: "m.facebook.com/reels/REELS_ID_2/", url: "https://m.facebook.com/reels/REELS_ID_2/", expectedValid: true },
  // Standard video
  { label: "www.facebook.com/watch?v=VID123", url: "https://www.facebook.com/watch?v=VID123", expectedValid: true },
  { label: "m.facebook.com/watch/VID456/", url: "https://m.facebook.com/watch/VID456/", expectedValid: true },
  // fb.watch
  { label: "fb.watch/VID789", url: "https://fb.watch/VID789", expectedValid: true },
  // User videos path
  { label: "www.facebook.com/username/videos/VID321/", url: "https://www.facebook.com/username/videos/VID321/", expectedValid: true },
];

// Rejected formats — partial paths, non-Facebook, invalid patterns
const rejectTests: TestCase[] = [
  // Partial paths — must be rejected
  { label: "Partial: e/r/1EZ3QqANF3/", url: "e/r/1EZ3QqANF3/", expectedValid: false },
  { label: "Partial: /share/r/ABC123/", url: "/share/r/ABC123/", expectedValid: false },
  { label: "Partial: share/v/XYZ789/", url: "share/v/XYZ789/", expectedValid: false },
  { label: "Partial: /reel/REEL_ID/", url: "/reel/REEL_ID/", expectedValid: false },
  // Non-Facebook domain
  { label: "Non-Facebook: https://youtube.com/watch?v=abc", url: "https://youtube.com/watch?v=abc", expectedValid: false },
  // Missing path
  { label: "No path: https://www.facebook.com", url: "https://www.facebook.com", expectedValid: false },
  // Empty share ID (trailing slash right after /share/r/)
  { label: "Empty share/r: https://www.facebook.com/share/r//", url: "https://www.facebook.com/share/r//", expectedValid: false },
  // Empty share ID (trailing slash right after /share/v/)
  { label: "Empty share/v: https://www.facebook.com/share/v//", url: "https://www.facebook.com/share/v//", expectedValid: false },
  // Wrong share type
  { label: "Wrong share type: /share/a/...", url: "https://www.facebook.com/share/a/ABC123/", expectedValid: false },
];

console.log("--- Accepted URLs (should be valid) ---\n");
for (const tc of acceptTests) {
  const result = isValidFacebookVideoUrl(tc.url);
  assert(result === tc.expectedValid, tc.label, result ? "accepted" : "rejected");
}

console.log("\n--- Rejected URLs (should be invalid) ---\n");
for (const tc of rejectTests) {
  const result = isValidFacebookVideoUrl(tc.url);
  assert(result === tc.expectedValid, tc.label, result ? "accepted" : "rejected");
}

// ─── Normalizer Tests ─────────────────────────────────────────────────────

console.log("\n=== Normalizer Tests ===\n");

const normalizeTests: NormalizeTestCase[] = [
  {
    label: "Strips fbclid tracking param",
    url: "https://www.facebook.com/share/r/ABC123/?fbclid=IwARxyz",
    expectedNormalized: "https://www.facebook.com/share/r/ABC123",
  },
  {
    label: "Strips mibextid and app tracking params",
    url: "https://www.facebook.com/share/v/XYZ789/?mibextid=abc&app=123",
    expectedNormalized: "https://www.facebook.com/share/v/XYZ789",
  },
  {
    label: "Preserves legitimate query params (not tracking)",
    url: "https://www.facebook.com/share/r/ABC123/?ref=bookmark",
    expectedNormalized: "https://www.facebook.com/share/r/ABC123",
  },
  {
    label: "Normalizes trailing slash",
    url: "https://www.facebook.com/share/r/ABC123/",
    expectedNormalized: "https://www.facebook.com/share/r/ABC123",
  },
  {
    label: "Handles m.facebook.com subdomain",
    url: "https://m.facebook.com/share/r/ABC123/?fbclid=IwARxyz",
    expectedNormalized: "https://m.facebook.com/share/r/ABC123",
  },
  {
    label: "Handles web.facebook.com subdomain",
    url: "https://web.facebook.com/share/v/XYZ789/?app=123&ref=menu",
    expectedNormalized: "https://web.facebook.com/share/v/XYZ789",
  },
  {
    label: "Preserves watch URL with v param",
    url: "https://www.facebook.com/watch?v=VID123&fbclid=IwARxyz",
    expectedNormalized: "https://www.facebook.com/watch?v=VID123",
  },
  {
    label: "Preserves reel URL with utm params",
    url: "https://www.facebook.com/reel/REEL_ID/?utm_source=instagram&utm_medium=story",
    expectedNormalized: "https://www.facebook.com/reel/REEL_ID",
  },
];

for (const tc of normalizeTests) {
  const result = normalizeFacebookUrl(tc.url);
  assert(result === tc.expectedNormalized, tc.label, `got: ${result}`);
}

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);

process.exit(failed > 0 ? 1 : 0);
