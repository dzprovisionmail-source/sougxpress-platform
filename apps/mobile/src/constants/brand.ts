/**
 * Soug-XPRESS Official Brand Constants
 *
 * Single source of truth for all brand identity values.
 * Logo assets are stored in assets/brand/ and assets/images/.
 * SVG source files are kept alongside PNGs for editing and scaling.
 *
 * Brand Mascot: Octavia the Octopus — friendly octopus mascot holding
 * an orange shopping cart in one tentacle and an orange delivery box in another.
 * Designed in Material Design 3 flat vector style with high contrast.
 *
 * IMPORTANT: The logo-wordmark.png is designed for LIGHT backgrounds only.
 * The logo-icon.png (orange circular background) works on any background.
 * logo-horizontal-dark.png is designed for DARK backgrounds (#121212).
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

// ─── Brand Colors ─────────────────────────────────────────────────────────────────

/**
 * Official brand palette.
 * - Orange (#FF8A00): warm, energetic primary accent
 * - Royal Blue (#1565C0): premium, trustworthy secondary
 */
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
 * Compact mascot icon — orange circular background with Octavia the Octopus.
 * Suitable for app icon, badges, and small spaces.
 * SVG source: assets/brand/logo-icon.svg
 */
export const LOGO_ICON = require("../../assets/brand/icon.png");

/**
 * Horizontal wordmark logo — "سوق إكسبريس" + "SougXpress" in brand colors.
 * Designed for light/white/ivory backgrounds (MarketplaceHeader).
 * SVG source: assets/brand/logo-wordmark.svg
 */
export const LOGO_WORDMARK = require("../../assets/brand/logo-horizontal.png");

/**
 * Full horizontal logo — mascot + wordmark + slogan, on dark background.
 * Designed for DARK backgrounds (#121212).
 * SVG source: assets/brand/logo-horizontal-dark.svg
 */
export const LOGO_DARK = require("../../assets/brand/logo-horizontal-dark.png");

/**
 * Full official logo — mascot + wordmark + slogan + icons.
 * This is the primary asset for entry screens and onboarding.
 */
export const LOGO_FULL = require("../../assets/brand/logo-full-official.png");

/**
 * Official Soug-Xpress horizontal wordmark supplied for the application UI.
 * Use only in brand surfaces such as entry and marketplace headers.
 */
export const LOGO_OFFICIAL_WORDMARK = require("../../assets/brand/logo-soug-xpress-official.png");

/**
 * Compatibility path — mascot icon stored in the default images directory.
 */
export const LOGO_COMPAT = require("../../assets/images/logo.png");

/**
 * SVG source paths for runtime rendering or web contexts.
 */
export const LOGO_ICON_SVG = require("../../assets/brand/logo-icon.svg");
export const LOGO_WORDMARK_SVG = require("../../assets/brand/logo-wordmark.svg");
export const LOGO_DARK_SVG = require("../../assets/brand/logo-horizontal-dark.svg");
export const MASCOT_SVG = require("../../assets/brand/mascot.svg");

// ─── Role Illustration Icons ──────────────────────────────────────────────────────

/**
 * Shopping/Customer role icon — used in role selection screen.
 * Illustrates the customer shopping experience.
 */
export const ICON_SHOPPING = require("../../assets/brand/icon-shopping.png");

/**
 * Store/Merchant role icon — used in role selection screen.
 * Illustrates the merchant store owner experience.
 */
export const ICON_STORE = require("../../assets/brand/icon-store.png");

/**
 * Delivery/Driver role icon — used in role selection screen.
 * Illustrates the delivery driver experience.
 */
export const ICON_DELIVERY = require("../../assets/brand/icon-courier.png");

/**
 * Admin role icon — reserved for future admin panel.
 * Currently unused in mobile app.
 */
// Fallback to security icon for admin as there is no specific admin asset in the brand identity
export const ICON_ADMIN = require("../../assets/brand/icon-security.png");

// ─── 3D Navigation & UI Icons ─────────────────────────────────────────────────────

export const ICON_HOME_3D = require("../../assets/brand/home_3d.png");
export const ICON_SEARCH_3D = require("../../assets/brand/search_3d.png");
export const ICON_CART_3D = require("../../assets/brand/cart_3d.png");
export const ICON_PROFILE_3D = require("../../assets/brand/profile_3d.png");
export const ICON_ORDERS_3D = require("../../assets/brand/orders_3d.png");
export const ICON_TRACK_3D = require("../../assets/brand/track_3d.png");
export const ICON_PAYMENT_3D = require("../../assets/brand/payment_3d.png");
export const ICON_DEALS_3D = require("../../assets/brand/deals_3d.png");
export const ICON_SETTINGS_3D = require("../../assets/brand/settings_3d.png");
export const ICON_SUPPORT_3D = require("../../assets/brand/support_3d.png");
export const ICON_MASCOT_HEAD = require("../../assets/brand/mascot_head.png");
export const ICON_MASCOT_SCOOTER = require("../../assets/brand/mascot_scooter.png");

// ─── Advertising Banners ──────────────────────────────────────────────────────────

export const BANNER_FRESH = require("../../assets/brand/banner_fresh.png");
export const BANNER_BAKERY = require("../../assets/brand/banner_bakery.png");
export const BANNER_DELIVERY = require("../../assets/brand/banner_delivery.png");

// ─── Brand Usage Rules ────────────────────────────────────────────────────────────

/**
 * Wordmark logo is designed for light backgrounds.
 * On dark or ivory backgrounds, use LOGO_DARK instead.
 */
export const LOGO_BACKGROUND = "dual" as const;
