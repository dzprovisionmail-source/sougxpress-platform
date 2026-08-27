import React from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "@/constants/theme";
import { Typography } from "./Typography";
import { BrandWordmark } from "./BrandWordmark";
import { useNotifications } from "@/hooks/useNotifications";

interface MarketplaceHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onBackPress?: () => void;
  theme?: ThemeType;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  onNotificationPress,
  onProfilePress,
  onBackPress,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;
  const { unreadCount } = useNotifications();

  return (
    <View style={[styles.container, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      {/* Back / Wordmark */}
      <View style={styles.logoContainer}>
        {onBackPress ? (
          <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
            <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
            <BrandWordmark size="market" />
        )}
      </View>

      {/* Actions: notification + profile */}
      <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity 
          onPress={onNotificationPress} 
          style={[styles.iconButton, { backgroundColor: colors.bgSurface }]}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: TOKENS.colors.brandPrimary, borderColor: colors.bgBase }]}>
              <Typography variant="caption" style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Typography>
            </View>
          )}
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
    top: 3,
    right: 3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: { color: "#FFF", fontSize: 9, lineHeight: 11, fontWeight: "800", marginTop: 0 },
});
