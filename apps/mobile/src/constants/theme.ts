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
    white: "#FFFFFF",
  };

  const palette = theme === "light" ? TOKENS.colors.light : theme === "ivory" ? TOKENS.colors.ivory : TOKENS.colors.dark;
  const semantic = {
    background: palette.bgBase,
    surface: palette.bgSurface,
    surfaceSecondary: palette.bgElevated,
    card: palette.bgSurface,
    text: palette.textPrimary,
    textSecondary: palette.textSecondary,
    textMuted: palette.textDisabled,
    textInverse: palette.textInverse,
    border: palette.borderSubtle,
    borderStrong: theme === "dark" ? "#496589" : theme === "ivory" ? "#C9BFAF" : "#CBD5E1",
    placeholder: palette.placeholder,
    icon: palette.icon,
    iconSecondary: palette.iconSecondary,
    primaryText: theme === "dark" ? "#0A1B33" : "#1A1A1A",
    successText: theme === "dark" ? "#071F10" : "#064E1B",
    warningText: "#1A1300",
    dangerText: "#FFFFFF",
    infoText: "#FFFFFF",
    inputBackground: palette.inputBackground,
    inputText: palette.inputText,
    inputBorder: palette.inputBorder,
    tabBackground: palette.tabBackground,
    tabText: palette.tabText,
    tabTextActive: palette.tabTextActive,
    overlay: palette.overlay,
  };
  return { ...common, ...palette, ...semantic };
};

/**
 * Default Theme is Dark as per docs/design-system/01_DESIGN_PHILOSOPHY.md
 */
export const DEFAULT_THEME: ThemeType = "dark";
