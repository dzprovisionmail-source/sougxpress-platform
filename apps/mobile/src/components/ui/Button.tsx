
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  icon,
  style,
  textStyle,
  disabled = false,
}) => {
  const { colors } = useAppTheme();

  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.textSecondary,
          borderColor: colors.textSecondary,
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
          borderWidth: 1,
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

  const getButtonTextStyles = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return {
          color: colors.textOnBrand,
        };
      case 'secondary':
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
        getButtonStyles(),
        style,
        (isLoading || disabled) && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <ActivityIndicator color={getButtonTextStyles().color} />
      ) : (
        <>
          {icon && <>{icon}</>}
          {title && (
            <Text style={[
              styles.buttonTextBase,
              getButtonTextStyles(),
              textStyle,
              icon ? styles.buttonTextWithIcon : null,
            ]}>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse', // RTL support
  },
  buttonTextBase: {
    ...typography.button,
    textAlign: 'center',
  },
  buttonTextWithIcon: {
    marginRight: spacing.sm, // Space between icon and text in RTL
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default Button;
