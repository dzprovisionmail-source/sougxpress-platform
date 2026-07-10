import React from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";
import { Typography } from "./Typography";

interface MarketplaceHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  theme?: ThemeType;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  onNotificationPress,
  onProfilePress,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.container, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.logoContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Ionicons name="cart" size={20} color={colors.textOnBrand} />
        </View>
        <Typography variant="h1" color="brand" style={styles.logoText}>
          SougXpress
        </Typography>
      </View>

      <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity 
          onPress={onNotificationPress} 
          style={[styles.iconButton, { backgroundColor: colors.bgSurface }]}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bgBase }]} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onProfilePress} 
          style={[styles.iconButton, { backgroundColor: colors.bgSurface }]}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HEADER_HEIGHT = 60;
const LOGO_SIZE = 36;
const ACTION_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.lg,
    marginTop: TOKENS.spacing.sm,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: TOKENS.spacing.xs,
  },
  logoText: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actions: {
    alignItems: "center",
  },
  iconButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: TOKENS.radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: TOKENS.spacing.xs,
    ...TOKENS.shadows.premium,
    shadowOpacity: 0.05,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  }
});
