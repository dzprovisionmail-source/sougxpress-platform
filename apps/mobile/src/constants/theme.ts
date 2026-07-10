import { TOKENS } from "./tokens";

export type ThemeType = "dark" | "light" | "ivory";

export const getThemeColors = (theme: ThemeType) => {
  const common = {
    primary: TOKENS.colors.brandPrimary,
    secondary: TOKENS.colors.brandSecondary,
    accent: TOKENS.colors.brandAccent,
    success: TOKENS.colors.statusSuccess,
    error: TOKENS.colors.statusError,
    warning: TOKENS.colors.statusWarning,
    info: TOKENS.colors.statusInfo,
  };

  switch (theme) {
    case "light":
      return { ...common, ...TOKENS.colors.light };
    case "ivory":
      return { ...common, ...TOKENS.colors.ivory };
    case "dark":
    default:
      return { ...common, ...TOKENS.colors.dark };
  }
};

/**
 * Default Theme is Dark as per docs/design-system/01_DESIGN_PHILOSOPHY.md
 */
export const DEFAULT_THEME: ThemeType = "dark";
