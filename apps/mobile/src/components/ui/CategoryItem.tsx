import React from "react";
import { 
  TouchableOpacity, 
  StyleSheet, 
  View,
  ViewStyle,
  I18nManager
} from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface CategoryItemProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  theme?: ThemeType;
  isActive?: boolean;
}

export const CategoryItem: React.FC<CategoryItemProps> = ({
  name,
  icon,
  onPress,
  style,
  theme = DEFAULT_THEME,
  isActive = false
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.container,
        {
          backgroundColor: isActive ? colors.primary : colors.bgSurface,
          borderColor: isActive ? colors.primary : colors.borderSubtle,
        },
        style
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.content, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Ionicons 
          name={icon} 
          size={18} 
          color={isActive ? colors.textOnBrand : colors.primary}
          style={{
            marginRight: isRTL ? 0 : TOKENS.spacing.sm,
            marginLeft: isRTL ? TOKENS.spacing.sm : 0,
          }}
        />
        <Typography 
          variant="caption" 
          align="center"
          style={{
            color: isActive ? colors.textOnBrand : colors.textPrimary,
            fontWeight: "600",
          }}
        >
          {name}
        </Typography>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    marginRight: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: TOKENS.spacing.sm,
  },
});
