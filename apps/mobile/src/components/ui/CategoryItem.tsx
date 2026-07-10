import React from "react";
import { 
  TouchableOpacity, 
  StyleSheet, 
  View,
  ViewStyle
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
}

export const CategoryItem: React.FC<CategoryItemProps> = ({
  name,
  icon,
  onPress,
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Typography variant="caption" align="center" style={styles.text}>
        {name}
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginRight: TOKENS.spacing.lg,
    width: 70,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: TOKENS.spacing.xs,
    ...TOKENS.shadows.premium,
    shadowOpacity: 0.05,
  },
  text: {
    fontWeight: "500",
  }
});
