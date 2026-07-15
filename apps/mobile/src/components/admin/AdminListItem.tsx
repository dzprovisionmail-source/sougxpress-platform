import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

interface AdminListItemProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
}

/**
 * Reusable RTL list item for Admin module pages.
 */
export const AdminListItem: React.FC<AdminListItemProps> = ({
  title,
  subtitle,
  badge,
  badgeColor,
  onPress,
  style,
  right,
}) => {
  const { colors, tokens } = useAppTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          marginBottom: tokens.spacing.sm,
        },
        style,
      ]}
    >
      {/* Chevron (left side in RTL = end of row) */}
      {onPress && <ChevronLeft color={colors.textDisabled} size={18} />}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: (badgeColor ?? colors.primary) + "22" },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: badgeColor ?? colors.primary,
                    fontFamily: tokens.typography.families.arabic,
                    fontSize: tokens.typography.sizes.xs,
                  },
                ]}
              >
                {badge}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.base,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right slot */}
      {right}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  content: {
    flex: 1,
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontWeight: "600",
    textAlign: "right",
  },
  subtitle: {
    textAlign: "right",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontWeight: "600",
  },
});
