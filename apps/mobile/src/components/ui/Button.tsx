import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  icon,
  style,
  textStyle,
  disabled = false,
  accessibilityLabel,
}) => {
  const { colors } = useAppTheme();
  const showLoading = isLoading || loading;

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          minHeight: 38,
          paddingVertical: TOKENS.spacing.xs,
          paddingHorizontal: TOKENS.spacing.md,
          borderRadius: TOKENS.radius.sm,
        };
      case 'lg':
        return {
          minHeight: 52,
          paddingVertical: TOKENS.spacing.md,
          paddingHorizontal: TOKENS.spacing.xl,
          borderRadius: TOKENS.radius.md,
        };
      case 'md':
      default:
        return {
          minHeight: TOKENS.touchTarget.minHeight,
          paddingVertical: TOKENS.spacing.sm,
          paddingHorizontal: TOKENS.spacing.lg,
          borderRadius: TOKENS.radius.md,
        };
    }
  };

  const getButtonTextStyles = (): TextStyle => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'secondary':
        return {
          color: colors.textOnBrand,
        };
      case 'ghost':
        return {
          color: colors.textPrimary,
        };
      case 'outline':
        return {
          color: colors.primary,
        };
      default:
        return {
          color: colors.textOnBrand,
        };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        getSizeStyles(),
        getButtonStyles(),
        (showLoading || disabled) && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={showLoading || disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {showLoading ? (
        <ActivityIndicator color={getButtonTextStyles().color} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          {title && (
            <Text
              style={[
                styles.buttonTextBase,
                { fontFamily: TOKENS.typography.families.arabic },
                getButtonTextStyles(),
                icon ? styles.buttonTextWithIcon : null,
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    minWidth: TOKENS.touchTarget.minWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
  },
  buttonTextBase: {
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextWithIcon: {
    marginRight: TOKENS.spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default Button;
