import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ViewStyle,
  StyleProp,
  I18nManager,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ArrowRight, Bell, CircleUserRound, LogOut } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { LOGO_DARK, LOGO_WORDMARK } from "@/constants/brand";
import { supabase } from "@/lib/supabase";

interface AdminPageShellProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  showNotification?: boolean;
  showProfile?: boolean;
  showLogout?: boolean;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Base shell for all Admin workspace pages.
 * - Arabic RTL
 * - Official logo / wordmark
 * - Page title
 * - Optional back, notification, and profile icons
 * - Dark / Light / Ivory theme support
 * - No white text on light/ivory backgrounds
 */
export const AdminPageShell: React.FC<AdminPageShellProps> = ({
  title,
  children,
  showBack = false,
  showNotification = false,
  showProfile = false,
  showLogout = false,
  scrollable = true,
  style,
  contentStyle,
}) => {
  const { colors, tokens, theme } = useAppTheme();

  const isDark = theme === "dark";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch {
      Alert.alert("خطأ", "تعذّر تسجيل الخروج");
    }
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.bgBase }, style]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderSubtle,
            paddingHorizontal: tokens.spacing.lg,
          },
        ]}
      >
        {/* Right side: back or profile */}
        <View style={styles.headerSide}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowRight color={colors.textPrimary} size={20} />
            </TouchableOpacity>
          ) : showProfile ? (
            <TouchableOpacity
              onPress={() => {}}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CircleUserRound color={colors.textPrimary} size={20} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        {/* Center: title */}
        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.md,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Left side: logo + notification + logout */}
        <View style={[styles.headerSide, styles.headerLeft]}>
          {showLogout && (
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LogOut color={colors.textSecondary} size={18} />
            </TouchableOpacity>
          )}
          {showNotification && (
            <TouchableOpacity
              onPress={() => router.push("/admin/notifications" as Parameters<typeof router.push>[0])}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bell color={colors.textPrimary} size={20} />
            </TouchableOpacity>
          )}
          <Image
            source={isDark ? LOGO_DARK : LOGO_WORDMARK}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Content */}
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingHorizontal: tokens.spacing.lg, paddingBottom: tokens.spacing["3xl"] },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    borderBottomWidth: 1,
  },
  headerSide: {
    flexDirection: "row-reverse",
    alignItems: "center",
    minWidth: 80,
  },
  headerLeft: {
    justifyContent: "flex-end",
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 32,
  },
});
