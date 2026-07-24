// Standalone test script for resolver logic (YouTube + Facebook)
// Run with: npx tsx tests/resolver-logic.test.ts
//
// Tests provider detection, normalization, and validation logic.

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

function detectProvider(rawUrl: string): string | null {
  if (!/^https?:\/\//i.test(rawUrl)) return null;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return HOST_PROVIDER_MAP[host] ?? null;
  } catch {
    return null;
  }
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

function isValidFacebookVideoUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
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

console.log("\n=== Resolver Logic Tests ===\n");

// Provider detection tests
console.log("--- Provider Detection ---\n");
const detectTests: Array<{ label: string; url: string; expected: string | null }> = [
  { label: "YouTube watch", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "youtube" },
  { label: "YouTube short", url: "https://youtu.be/dQw4w9WgXcQ", expected: "youtube" },
  { label: "YouTube shorts", url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "youtube" },
  { label: "Facebook share/r", url: "https://www.facebook.com/share/r/1HV9WZFzoC/", expected: "facebook" },
  { label: "Facebook share/v", url: "https://www.facebook.com/share/v/1EMXkuBWky/", expected: "facebook" },
  { label: "Invalid URL", url: "not-a-url", expected: null },
];

for (const tc of detectTests) {
  const result = detectProvider(tc.url);
  assert(result === tc.expected, tc.label, `got: ${result}`);
}

// YouTube normalization tests
console.log("\n--- YouTube Normalization ---\n");
const ytNormTests: Array<{ label: string; url: string; expected: string }> = [
  { label: "watch?v= format", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  { label: "youtu.be format", url: "https://youtu.be/dQw4w9WgXcQ", expected: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  { label: "shorts format", url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
];

for (const tc of ytNormTests) {
  const result = normalizeYouTubeUrl(tc.url);
  assert(result === tc.expected, tc.label, `got: ${result}`);
}

// YouTube ID extraction tests
console.log("\n--- YouTube ID Extraction ---\n");
const ytIdTests: Array<{ label: string; url: string; expected: string | null }> = [
  { label: "watch?v= ID", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { label: "youtu.be ID", url: "https://youtu.be/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { label: "shorts ID", url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { label: "no ID", url: "https://www.youtube.com", expected: null },
];

for (const tc of ytIdTests) {
  const result = extractYouTubeId(tc.url);
  assert(result === tc.expected, tc.label, `got: ${result}`);
}

// Facebook validation tests
console.log("\n--- Facebook Validation ---\n");
const fbValidTests: Array<{ label: string; url: string; expected: boolean }> = [
  { label: "Valid share/r", url: "https://www.facebook.com/share/r/1HV9WZFzoC/", expected: true },
  { label: "Valid share/v", url: "https://www.facebook.com/share/v/1EMXkuBWky/", expected: true },
  { label: "Invalid: partial path", url: "e/r/1HV9WZFzoC/", expected: false },
  { label: "Invalid: no https", url: "www.facebook.com/share/r/ABC", expected: false },
];

for (const tc of fbValidTests) {
  const result = isValidFacebookVideoUrl(tc.url);
  assert(result === tc.expected, tc.label, `got: ${result}`);
}

// Summary
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
