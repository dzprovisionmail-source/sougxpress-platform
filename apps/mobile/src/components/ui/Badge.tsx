import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Typography } from './Typography';
import { TOKENS } from '../../constants/tokens';
import { useAppTheme, ThemeType } from '../../contexts/ThemeContext';

export interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'warning' | 'info' | 'default';
  style?: StyleProp<ViewStyle>;
  theme?: ThemeType;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = 'primary',
  style,
}) => {
  const { colors } = useAppTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
      case 'default':
        return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: colors.textSecondary };
      case 'accent':
        return { backgroundColor: 'rgba(255, 138, 0, 0.15)', color: colors.primary };
      case 'success':
        return { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: colors.success };
      case 'error':
        return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: colors.error };
      case 'warning':
        return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: colors.warning };
      case 'info':
        return { backgroundColor: 'rgba(21, 101, 192, 0.15)', color: colors.secondary };
      case 'primary':
      default:
        return { backgroundColor: 'rgba(255, 138, 0, 0.15)', color: colors.primary };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: variantStyles.backgroundColor }, style]}>
      {children ? (
        children
      ) : (
        <Typography
          variant="caption"
          style={[styles.text, { color: variantStyles.color }]}
        >
          {label}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    fontSize: TOKENS.typography.sizes.xs,
  },
});

export default Badge;
