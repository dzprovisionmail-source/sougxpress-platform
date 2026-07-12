import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";

interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "accent" | "success" | "error";
  style?: ViewStyle;
  theme?: ThemeType;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return { backgroundColor: "rgba(158, 158, 158, 0.1)", color: colors.textSecondary };
      case "accent":
        return { backgroundColor: "rgba(255, 171, 64, 0.1)", color: colors.accent };
      case "success":
        return { backgroundColor: "rgba(76, 175, 80, 0.1)", color: "#4CAF50" };
      case "error":
        return { backgroundColor: "rgba(244, 67, 54, 0.1)", color: colors.error };
      case "primary":
      default:
        return { backgroundColor: "rgba(255, 138, 0, 0.1)", color: colors.primary };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: variantStyles.backgroundColor }, style]}>
      <Typography 
        variant="caption" 
        style={[styles.text, { color: variantStyles.color }]}
      >
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 2,
    borderRadius: TOKENS.radius.sm,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
    fontSize: 10,
    textTransform: "uppercase",
  }
});
