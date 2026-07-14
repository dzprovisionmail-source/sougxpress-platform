import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "success" | "error" | "warning" | "info" | "default";
  style?: ViewStyle;
  theme?: ThemeType;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = "primary",
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
      case "default":
        return { backgroundColor: "rgba(158, 158, 158, 0.1)", color: colors.textSecondary };
      case "accent":
        return { backgroundColor: "rgba(255, 171, 64, 0.1)", color: colors.accent };
      case "success":
        return { backgroundColor: "rgba(76, 175, 80, 0.1)", color: "#4CAF50" };
      case "error":
        return { backgroundColor: "rgba(244, 67, 54, 0.1)", color: colors.error };
      case "warning":
        return { backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#FF9800" };
      case "info":
        return { backgroundColor: "rgba(33, 150, 243, 0.1)", color: "#2196F3" };
      case "primary":
      default:
        return { backgroundColor: "rgba(255, 138, 0, 0.1)", color: colors.primary };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: variantStyles.backgroundColor }, style]}>
      {children ? (
        children
      ) : (
        <Typography 
          variant="caption" 
          style={[styles.text, { color: variantStyles.color }]}
        >
          {label}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 2,
    borderRadius: TOKENS.radius.sm,
    alignSelf: "flex-start",
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: "700",
    fontSize: 10,
    textTransform: "uppercase",
  }
});
