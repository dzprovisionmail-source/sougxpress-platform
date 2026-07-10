import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  Animated
} from "react-native";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  theme?: "dark" | "light" | "ivory";
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          button: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle },
          text: { color: colors.textPrimary },
        };
      case "outline":
        return {
          button: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
          text: { color: colors.primary },
        };
      case "ghost":
        return {
          button: { backgroundColor: "transparent" },
          text: { color: colors.textSecondary },
        };
      case "primary":
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.textOnBrand },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          button: { paddingVertical: TOKENS.spacing.xs, paddingHorizontal: TOKENS.spacing.md, height: 36 },
          text: { fontSize: TOKENS.typography.sizes.sm },
        };
      case "lg":
        return {
          button: { paddingVertical: TOKENS.spacing.lg, paddingHorizontal: TOKENS.spacing.xl, height: 56 },
          text: { fontSize: TOKENS.typography.sizes.lg },
        };
      case "md":
      default:
        return {
          button: { paddingVertical: TOKENS.spacing.md, paddingHorizontal: TOKENS.spacing.lg, height: 48 },
          text: { fontSize: TOKENS.typography.sizes.base },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.baseButton,
          variantStyles.button,
          sizeStyles.button,
          disabled && styles.disabledButton,
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? colors.textOnBrand : colors.primary} />
        ) : (
          <Text style={[
            styles.baseText,
            variantStyles.text,
            sizeStyles.text,
            disabled && styles.disabledText,
            textStyle
          ]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: TOKENS.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...TOKENS.shadows.premium,
  },
  baseText: {
    fontWeight: "600",
    textAlign: "center",
    fontFamily: TOKENS.typography.families.arabic,
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: "#9E9E9E",
  },
});
