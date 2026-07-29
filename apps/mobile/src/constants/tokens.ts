/**
 * Soug-XPRESS Mobile UI Design Tokens (Official)
 * 
 * Centralized design system foundation for apps/mobile/src.
 * Enforces Cairo primary (Arabic) and Tajawal secondary typography,
 * strict color contrast, spacing, radius, shadows, and minimum 44px touch targets.
 */
export const TOKENS = {
  colors: {
    // Official Brand Palette
    brandPrimary: "#FF8A00",      // Primary Accent
    brandSecondary: "#1565C0",    // Primary Blue
    brandAccent: "#FF8A00",

    // Status Colors
    statusSuccess: "#22C55E",     // Success
    statusWarning: "#F59E0B",     // Warning
    statusError: "#EF4444",       // Error
    statusInfo: "#1565C0",

    // Light Mode (#FFFFFF background)
    light: {
      bgBase: "#FFFFFF",
      bgSurface: "#F8FAFC",
      bgElevated: "#FFFFFF",
      borderSubtle: "#E2E8F0",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      textDisabled: "#94A3B8",
      textOnBrand: "#FFFFFF",
      placeholder: "#94A3B8",
    },

    // Dark Mode (#121212 background, white text)
    dark: {
      bgBase: "#121212",
      bgSurface: "#1E1E1E",
      bgElevated: "#282828",
      borderSubtle: "#333333",
      textPrimary: "#FFFFFF",     // White text on dark
      textSecondary: "#A3A3A3",
      textDisabled: "#525252",
      textOnBrand: "#FFFFFF",
      placeholder: "#737373",
    },

    // Ivory Mode (Warm Light)
    ivory: {
      bgBase: "#FFFDF7",
      bgSurface: "#F7F3E9",
      bgElevated: "#FFFFFF",
      borderSubtle: "#E8E2D5",
      textPrimary: "#2C221E",
      textSecondary: "#78685E",
      textDisabled: "#A8988E",
      textOnBrand: "#FFFFFF",
      placeholder: "#A8988E",
    },
  },

  typography: {
    families: {
      arabic: "Cairo",            // Primary Font
      secondary: "Tajawal",       // Secondary Font
      mono: "Tajawal",
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      md: 18,
      lg: 20,
      xl: 24,
      "2xl": 32,
    },
    lineHeights: {
      arabic: 1.6,
      secondary: 1.45,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
    huge: 40,
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },

  shadows: {
    small: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 8,
    },
    premium: {
      shadowColor: "#FF8A00",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  touchTarget: {
    minHeight: 44, // Minimum 44px touch target
    minWidth: 44,
  },

  animations: {
    durations: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      out: "ease-out",
      inOut: "ease-in-out",
    },
  },
};
