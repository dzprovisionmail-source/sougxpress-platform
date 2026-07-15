import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { ThemeType } from "../../constants/theme";

/**
 * Theme-aware primitives for the Merchant and Driver workspaces.
 * Built directly on constants/tokens.ts + constants/theme.ts so the two
 * workspaces render consistently across Dark, Light and Ivory — unlike the
 * legacy design/colors.ts based components used elsewhere in the app.
 */

export const WorkspaceScreen: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => {
  const { colors } = useAppTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.bgBase }, style]}>{children}</View>;
};

export const SectionCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({
  children,
  icon,
}) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={[styles.sectionTitleRow, { marginBottom: tokens.spacing.md }]}>
      {icon}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.md,
          fontWeight: "700",
          fontFamily: tokens.typography.families.arabic,
          marginRight: icon ? tokens.spacing.sm : 0,
        }}
      >
        {children}
      </Text>
    </View>
  );
};

export const WorkspaceText: React.FC<{
  children: React.ReactNode;
  variant?: "title" | "body" | "caption";
  color?: "primary" | "secondary" | "disabled" | "brand" | "success" | "error";
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}> = ({ children, variant = "body", color = "primary", style, numberOfLines }) => {
  const { colors, tokens } = useAppTheme();
  const sizeMap = { title: tokens.typography.sizes.lg, body: tokens.typography.sizes.base, caption: tokens.typography.sizes.sm };
  const weightMap: Record<string, TextStyle["fontWeight"]> = { title: "700", body: "400", caption: "400" };
  const colorMap: Record<string, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    disabled: colors.textDisabled,
    brand: colors.primary,
    success: colors.success,
    error: colors.error,
  };
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: tokens.typography.families.arabic,
          fontSize: sizeMap[variant],
          fontWeight: weightMap[variant],
          color: colorMap[color],
          textAlign: "right",
          lineHeight: tokens.typography.lineHeights.arabic * sizeMap[variant],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export const WorkspaceButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, onPress, variant = "primary", isLoading, disabled, icon, style }) => {
  const { colors, tokens } = useAppTheme();

  const variantStyle: ViewStyle =
    variant === "primary"
      ? { backgroundColor: colors.primary, borderColor: colors.primary }
      : variant === "danger"
      ? { backgroundColor: colors.error, borderColor: colors.error }
      : variant === "outline"
      ? { backgroundColor: "transparent", borderColor: colors.primary, borderWidth: 1 }
      : { backgroundColor: "transparent", borderColor: "transparent" };

  const textColor =
    variant === "primary" || variant === "danger" ? colors.textOnBrand : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.85}
      style={[
        styles.button,
        variantStyle,
        { borderRadius: tokens.radius.md, paddingVertical: tokens.spacing.md, paddingHorizontal: tokens.spacing.lg },
        (disabled || isLoading) && { opacity: 0.6 },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: textColor,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.base,
              fontWeight: "600",
              marginRight: icon ? tokens.spacing.sm : 0,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const StatCard: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      <Text
        style={{
          color: accent || colors.primary,
          fontSize: tokens.typography.sizes.xl,
          fontWeight: "800",
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: tokens.typography.sizes.xs,
          fontFamily: tokens.typography.families.arabic,
          marginTop: tokens.spacing.xs,
          textAlign: "right",
        }}
      >
        {label}
      </Text>
    </View>
  );
};

export const StatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tokens } = useAppTheme();
  return (
    <View style={[styles.statGrid, { paddingHorizontal: tokens.spacing.lg, gap: tokens.spacing.md }]}>
      {children}
    </View>
  );
};

export const WorkspaceRow: React.FC<{
  label: string;
  value?: string;
  icon?: React.ReactNode;
  isLast?: boolean;
}> = ({ label, value, icon, isLast }) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        { paddingVertical: tokens.spacing.sm },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
      ]}
    >
      {icon}
      <Text
        style={{
          flex: 1,
          textAlign: "right",
          color: colors.textSecondary,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.sm,
          marginRight: icon ? tokens.spacing.sm : 0,
        }}
      >
        {label}
      </Text>
      {value !== undefined && (
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.sm,
            fontWeight: "600",
          }}
        >
          {value}
        </Text>
      )}
    </View>
  );
};

export const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={[styles.centered, { padding: tokens.spacing["2xl"] }]}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.base,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            marginTop: tokens.spacing.md,
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
  { value: "dark", label: "داكن" },
  { value: "light", label: "فاتح" },
  { value: "ivory", label: "عاجي" },
];

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, colors, tokens } = useAppTheme();
  return (
    <View style={[styles.themeSwitcher, { gap: tokens.spacing.sm }]}>
      {THEME_OPTIONS.map((option) => {
        const active = option.value === theme;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => setTheme(option.value)}
            style={[
              styles.themeOption,
              {
                borderRadius: tokens.radius.sm,
                paddingVertical: tokens.spacing.sm,
                borderColor: active ? colors.primary : colors.borderSubtle,
                backgroundColor: active ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.textOnBrand : colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
                fontWeight: "600",
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  button: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    alignItems: "flex-end",
  },
  statGrid: {
    flexDirection: "row-reverse",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  themeSwitcher: {
    flexDirection: "row-reverse",
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
  },
});
