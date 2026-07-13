/**
 * Soug-XPRESS Official Brand Constants
 *
 * Single source of truth for all brand identity values.
 * Logo assets are stored in assets/brand/ and assets/images/.
 *
 * IMPORTANT: The official logo is designed for DARK backgrounds only.
 * Do NOT use logo-horizontal-dark.png on light/ivory surfaces.
 * For light surfaces, use text-based wordmark "سوق إكسبريس" instead.
 */

// ─── Brand Names ─────────────────────────────────────────────────────────────────

/** Arabic brand name — always display in RTL order */
export const BRAND_NAME_AR = "سوق إكسبريس";

/** English brand name */
export const BRAND_NAME_EN = "SougXpress";

/** Arabic slogan */
export const BRAND_SLOGAN = "سوقك يوصلك لبابك";

/** City / location label */
export const BRAND_CITY_LABEL = "سوق عين الصفراء";

// ─── Brand Colors ──────────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  orange: "#FF8A00",
  blue: "#0D47A1",
  darkNavy: "#0A1B33",
  black: "#121212",
  darkGray: "#2A2A2A",
  white: "#FFFFFF",
  ivory: "#FFFBF0",
} as const;

// ─── Logo Asset Paths ─────────────────────────────────────────────────────────────

/**
 * Main horizontal logo — designed for DARK backgrounds.
 * Contains mascot character + "SougXpress" wordmark + slogan.
 * DO NOT use on light/white/ivory surfaces.
 */
export const LOGO_DARK = require("../../assets/brand/logo-horizontal-dark.png");

/**
 * Compact mascot icon — suitable for small spaces (headers, badges).
 * Contains the ninja mascot character.
 * Designed for DARK backgrounds.
 */
export const LOGO_ICON = require("../../assets/brand/logo-icon.png");

/**
 * Compatibility path — same as LOGO_DARK, stored in the default images directory
 * for apps that import from assets/images/.
 */
export const LOGO_COMPAT = require("../../assets/images/logo.png");

// ─── Brand Usage Rules ────────────────────────────────────────────────────────────

/**
 * Logo is designed for dark backgrounds only.
 * On light or ivory backgrounds, use the text wordmark "سوق إكسبريس" instead.
 */
export const LOGO_BACKGROUND = "dark-only" as const;
