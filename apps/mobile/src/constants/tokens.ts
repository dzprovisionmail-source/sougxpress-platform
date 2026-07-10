/**
 * SougXpress Design Tokens
 * 
 * Official source of truth for all UI constants.
 * Based on docs/design-system/
 */

export const TOKENS = {
  colors: {
    // Brand
    brandPrimary: "#00E5FF",
    brandSecondary: "#7C4DFF",
    brandAccent: "#FFAB40",
    
    // Status
    statusSuccess: "#00C853",
    statusError: "#D50000",
    statusWarning: "#FFD600",
    statusInfo: "#2979FF",
    
    // Dark Palette (Primary)
    dark: {
      bgBase: "#000000",
      bgSurface: "#121212",
      bgElevated: "#1E1E1E",
      borderSubtle: "#2C2C2C",
      textPrimary: "#FFFFFF",
      textSecondary: "#B0B0B0",
      textDisabled: "#4F4F4F",
      textOnBrand: "#000000",
    },
    
    // Light Palette
    light: {
      bgBase: "#FFFFFF",
      bgSurface: "#F5F5F5",
      bgElevated: "#FFFFFF",
      borderSubtle: "#E0E0E0",
      textPrimary: "#000000",
      textSecondary: "#757575",
      textDisabled: "#BDBDBD",
      textOnBrand: "#FFFFFF",
    },
    
    // Ivory Palette (Warm Light)
    ivory: {
      bgBase: "#FFFBF0",
      bgSurface: "#FFF5E6",
      bgElevated: "#FFFFFF",
      borderSubtle: "#F0E0C0",
      textPrimary: "#2C1A0A",
      textSecondary: "#5D4037",
      textDisabled: "#A1887F",
      textOnBrand: "#FFFFFF",
    }
  },
  
  typography: {
    families: {
      arabic: "Cairo",
      latin: "Inter",
      mono: "IBM Plex Mono",
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
      arabic: 1.7,
      latin: 1.45,
    }
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
  },
  
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  
  shadows: {
    premium: {
      shadowColor: "#00E5FF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    }
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
    }
  }
};
