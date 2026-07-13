import React from "react";
import { 
  View, 
  Image,
  StyleSheet, 
  TouchableOpacity, 
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_NAME_AR, LOGO_WORDMARK } from "../../constants/brand";
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
      {/* Wordmark logo for marketplace header */}
      <View style={styles.logoContainer}>
        <Image
          source={LOGO_WORDMARK}
          style={styles.wordmarkLogo}
          resizeMode="contain"
        />
      </View>

      {/* Actions: notification + profile */}
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
const WORDMARK_HEIGHT = 40;
const ACTION_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
    backgroundColor: "transparent",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkLogo: {
    height: WORDMARK_HEIGHT,
    maxWidth: 200,
  },
  actions: {
    alignItems: "center",
    flexShrink: 0,
    gap: TOKENS.spacing.xs,
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
    flexShrink: 0,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  }
});
