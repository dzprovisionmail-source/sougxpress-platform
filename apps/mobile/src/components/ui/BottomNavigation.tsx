import React from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  I18nManager,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";

interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (id: string) => void;
  theme?: ThemeType;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  const items: NavItem[] = [
    { id: "home", label: "الرئيسية", icon: "home-outline", activeIcon: "home" },
    { id: "search", label: "البحث", icon: "search-outline", activeIcon: "search" },
    { id: "orders", label: "طلباتي", icon: "cart-outline", activeIcon: "cart" },
    { id: "profile", label: "حسابي", icon: "person-outline", activeIcon: "person" },
  ];

  // Mirrored items for RTL if needed, but labels are already Arabic.
  // The layout direction handles the order.

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.bgSurface, 
        borderTopColor: colors.borderSubtle,
        flexDirection: isRTL ? "row-reverse" : "row"
      }
    ]}>
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onTabPress(item.id)}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isActive ? item.activeIcon : item.icon} 
              size={24} 
              color={isActive ? colors.primary : colors.textSecondary} 
            />
            <Typography 
              variant="caption" 
              style={[
                styles.label, 
                { color: isActive ? colors.primary : colors.textSecondary }
              ]}
            >
              {item.label}
            </Typography>
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    ...TOKENS.shadows.premium,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 44,
  },
  label: {
    marginTop: 4,
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 20,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  }
});
