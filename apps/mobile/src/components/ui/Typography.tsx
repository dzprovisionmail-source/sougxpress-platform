import React from "react";
import { Text, TextStyle, StyleSheet, I18nManager } from "react-native";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

interface TypographyProps {
  children: React.ReactNode;
  variant?: "display" | "h1" | "h2" | "h3" | "body" | "caption" | "button";
  color?: "primary" | "secondary" | "disabled" | "brand" | "error" | "success";
  align?: "left" | "center" | "right" | "auto";
  style?: TextStyle;
  theme?: "dark" | "light" | "ivory";
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = "body",
  color = "primary",
  align = "auto",
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const getVariantStyle = () => {
    switch (variant) {
      case "display":
        return { fontSize: TOKENS.typography.sizes["2xl"], fontWeight: "800" as const };
      case "h1":
        return { fontSize: TOKENS.typography.sizes.xl, fontWeight: "700" as const };
      case "h2":
        return { fontSize: TOKENS.typography.sizes.lg, fontWeight: "700" as const };
      case "h3":
        return { fontSize: TOKENS.typography.sizes.md, fontWeight: "600" as const };
      case "caption":
        return { fontSize: TOKENS.typography.sizes.xs, fontWeight: "400" as const };
      case "button":
        return { fontSize: TOKENS.typography.sizes.base, fontWeight: "600" as const };
      case "body":
      default:
        return { fontSize: TOKENS.typography.sizes.base, fontWeight: "400" as const };
    }
  };

  const getColorStyle = () => {
    switch (color) {
      case "secondary":
        return colors.textSecondary;
      case "disabled":
        return colors.textDisabled;
      case "brand":
        return colors.primary;
      case "error":
        return colors.error;
      case "success":
        return colors.success;
      case "primary":
      default:
        return colors.textPrimary;
    }
  };

  return (
    <Text
      style={[
        {
          fontFamily: TOKENS.typography.families.arabic,
          color: getColorStyle(),
          textAlign: align === "auto" ? (isRTL ? "right" : "left") : align,
          lineHeight: TOKENS.typography.lineHeights.arabic * (getVariantStyle().fontSize || 16),
        },
        getVariantStyle(),
        style,
      ]}
    >
      {children}
    </Text>
  );
};
