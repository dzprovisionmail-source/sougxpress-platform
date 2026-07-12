import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from "react-native";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "elevated" | "outline" | "flat";
  theme?: "dark" | "light" | "ivory";
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = "elevated",
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  
  const Container = onPress ? TouchableOpacity : View;

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return {
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        };
      case "flat":
        return {
          backgroundColor: colors.bgSurface,
        };
      case "elevated":
      default:
        return {
          backgroundColor: colors.bgSurface,
          ...TOKENS.shadows.premium,
          shadowColor: theme === "dark" ? TOKENS.colors.brandPrimary : "#000000",
          shadowOpacity: theme === "dark" ? 0.08 : 0.08,
        };
    }
  };

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.baseCard,
        getVariantStyles(),
        style
      ]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.lg,
    overflow: "hidden",
  },
});
