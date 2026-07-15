import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

interface AdminStatCardProps {
  label: string;
  value: string | number | null;
  accent?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Stat card for the Admin dashboard.
 * Displays a numeric metric with an Arabic label.
 * If value is null, shows an unavailable indicator.
 */
export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  accent,
  onPress,
  style,
}) => {
  const { colors, tokens } = useAppTheme();

  const displayValue = value === null ? "—" : String(value);
  const valueColor = accent ?? colors.primary;

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.value,
          {
            color: valueColor,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.xl,
          },
        ]}
      >
        {displayValue}
      </Text>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[{ flex: 1 }, style]}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[{ flex: 1 }, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    alignItems: "flex-end",
  },
  value: {
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    fontWeight: "500",
    textAlign: "right",
  },
});
